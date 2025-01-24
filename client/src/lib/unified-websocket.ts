import { useUnifiedTokenStore } from './unified-token-store';
import { Connection, PublicKey } from '@solana/web3.js';
import { preloadTokenImages } from './token-metadata';
import { mapPumpPortalData } from './pump-portal-websocket';

// Constants
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '004f9b13-f526-4952-9998-52f5c7bec6ee';
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const PUMPPORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 5000;
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;

interface TokenTrade {
  signature: string;
  timestamp: number;
  tokenAddress: string;
  amount: number;
  price: number;
  priceUsd: number;
  buyer: string;
  seller: string;
  type: 'buy' | 'sell';
}

class UnifiedWebSocket {
  private heliusWs: WebSocket | null = null;
  private pumpPortalWs: WebSocket | null = null;
  private heliusReconnectAttempts = 0;
  private pumpPortalReconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;

  connect() {
    this.connectHelius();
    this.connectPumpPortal();
  }

  private connectHelius() {
    if (this.heliusWs?.readyState === WebSocket.OPEN) {
      console.log('[Unified WebSocket] Helius already connected');
      return;
    }

    try {
      console.log('[Unified WebSocket] Connecting to Helius...');
      this.heliusWs = new WebSocket(HELIUS_WS_URL);

      this.heliusWs.onopen = () => {
        console.log('[Unified WebSocket] Helius connected');
        this.heliusReconnectAttempts = 0;
        this.startHeartbeat();
        useUnifiedTokenStore.getState().setConnected(true);
      };

      this.heliusWs.onmessage = this.handleHeliusMessage.bind(this);
      this.heliusWs.onclose = this.handleHeliusClose.bind(this);
      this.heliusWs.onerror = (error) => {
        console.error('[Unified WebSocket] Helius error:', error);
        this.heliusWs?.close();
      };

    } catch (error) {
      console.error('[Unified WebSocket] Helius connection failed:', error);
      this.handleHeliusClose();
    }
  }

  private connectPumpPortal() {
    if (this.pumpPortalWs?.readyState === WebSocket.OPEN) {
      console.log('[Unified WebSocket] PumpPortal already connected');
      return;
    }

    try {
      console.log('[Unified WebSocket] Connecting to PumpPortal...');
      this.pumpPortalWs = new WebSocket(PUMPPORTAL_WS_URL);

      this.pumpPortalWs.onopen = () => {
        console.log('[Unified WebSocket] PumpPortal connected');
        this.pumpPortalReconnectAttempts = 0;
        this.subscribeToPumpPortal();
      };

      this.pumpPortalWs.onmessage = this.handlePumpPortalMessage.bind(this);
      this.pumpPortalWs.onclose = this.handlePumpPortalClose.bind(this);
      this.pumpPortalWs.onerror = (error) => {
        console.error('[Unified WebSocket] PumpPortal error:', error);
        this.pumpPortalWs?.close();
      };

    } catch (error) {
      console.error('[Unified WebSocket] PumpPortal connection failed:', error);
      this.handlePumpPortalClose();
    }
  }

  private requestAllTokenUpdates() {
    const store = useUnifiedTokenStore.getState();
    const tokens = store.tokens;
    const activeToken = store.activeToken;
    
    if (this.pumpPortalWs?.readyState === WebSocket.OPEN) {
      // Update active token every second
      if (activeToken) {
        this.pumpPortalWs.send(JSON.stringify({
          method: "batchTokenUpdate",
          keys: [activeToken]
        }));
      }
      
      // Update other tokens less frequently
      if (Date.now() % 5000 === 0 && tokens.length > 0) {
        const otherTokens = tokens
          .filter(t => t.address !== activeToken)
          .map(t => t.address);
          
        if (otherTokens.length > 0) {
          this.pumpPortalWs.send(JSON.stringify({
            method: "batchTokenUpdate",
            keys: otherTokens
          }));
        }
      }
    }
  }

  private subscribeToPumpPortal() {
    if (this.pumpPortalWs?.readyState !== WebSocket.OPEN) return;

    // Set up periodic updates
    if (!this.updateInterval) {
      this.updateInterval = setInterval(() => {
        this.requestAllTokenUpdates();
      }, 3000); // Check for updates every 3 seconds
    }

    this.pumpPortalWs.send(JSON.stringify({
      method: "subscribeNewToken",
      keys: []
    }));

    const store = useUnifiedTokenStore.getState();
    const existingTokens = store.tokens.map(t => t.address);

    if (existingTokens.length > 0) {
      this.pumpPortalWs.send(JSON.stringify({
        method: "subscribeTokenTrade",
        keys: existingTokens
      }));
    }
  }

  private async handleHeliusMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      if (data.method === 'accountNotification') {
        await this.handleAccountUpdate(data.params.result);
      }

      if (data.method === 'pong') {
        this.resetHeartbeatTimeout();
      }
    } catch (error) {
      console.error('[Unified WebSocket] Helius message error:', error);
    }
  }

  private handlePumpPortalMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const store = useUnifiedTokenStore.getState();
      const ws = this.pumpPortalWs;

      // Enhanced subscription and error handling
      if (data.message?.includes('Successfully subscribed')) {
        console.log('[Unified WebSocket] Successfully subscribed, requesting updates');
        this.requestAllTokenUpdates();
        return;
      }

      if (data.errors) {
        console.error('[Unified WebSocket] PumpPortal error:', data.errors);
        this.handlePumpPortalClose();
        return;
      }

      // Periodic resubscription to ensure we don't miss updates
      if (!this.resubscribeInterval) {
        this.resubscribeInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            this.subscribeToPumpPortal();
          }
        }, 30000); // Resubscribe every 30 seconds
      }

      // Request immediate update for all tokens every 5 seconds
      if (!this.updateInterval) {
        this.updateInterval = setInterval(() => {
          const tokens = store.tokens;
          if (ws?.readyState === WebSocket.OPEN && tokens.length > 0) {
            ws.send(JSON.stringify({
              method: "batchTokenUpdate",
              keys: tokens.map(t => t.address)
            }));
          }
        }, 5000);
      }

      if (data.txType === 'create' && data.mint) {
        try {
          const token = await mapPumpPortalData(data);
          if (!token) return;

          // Debounce token addition
          setTimeout(() => {
            store.addToken(token);

            if (token.imageLink) {
              preloadTokenImages([{
                imageLink: token.imageLink,
                symbol: token.symbol
              }]);
            }

            if (ws?.readyState === WebSocket.OPEN) {
              // Bundle subscriptions into one message
              ws.send(JSON.stringify({
                method: "batchSubscribe",
                subscriptions: [
                  { type: "trade", address: token.address },
                  { type: "account", address: token.address }
                ]
              }));
            }
          }, 100);
        } catch (err) {
          console.error('[PumpPortal] Failed to process token:', err);
        }
      } else if (['buy', 'sell'].includes(data.txType) && data.mint) {
        // Add timestamp if not present
        const trade = {
          ...data,
          timestamp: data.timestamp || Date.now()
        };

        store.addTradeToHistory(data.mint, trade);

        // Request a full update for this token
        ws?.send(JSON.stringify({
          method: "requestTokenUpdate",
          keys: [data.mint]
        }));
      }

      // Implement periodic token updates
      setInterval(() => {
        const tokens = store.getState().tokens;
        tokens.forEach(token => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              method: "requestTokenUpdate",
              keys: [token.address]
            }));
          }
        });
      }, 15000); // Poll every 15 seconds
    } catch (error) {
      console.error('[Unified WebSocket] PumpPortal message error:', error);
    }
  }

  private handleHeliusClose() {
    this.cleanupHeartbeat();
    useUnifiedTokenStore.getState().setConnected(false);

    if (!this.isManualDisconnect && this.heliusReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(1.5, this.heliusReconnectAttempts), 30000);
      this.heliusReconnectAttempts++;
      console.log(`[Unified WebSocket] Helius reconnecting ${this.heliusReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
      setTimeout(() => this.connectHelius(), delay);
    }
  }

  private handlePumpPortalClose() {
    if (!this.isManualDisconnect && this.pumpPortalReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(1.5, this.pumpPortalReconnectAttempts), 30000);
      this.pumpPortalReconnectAttempts++;
      console.log(`[Unified WebSocket] PumpPortal reconnecting ${this.pumpPortalReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
      setTimeout(() => this.connectPumpPortal(), delay);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.heliusWs?.readyState === WebSocket.OPEN) {
        this.heliusWs.send(JSON.stringify({ method: 'ping' }));
        this.resetHeartbeatTimeout();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private resetHeartbeatTimeout() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }

    this.heartbeatTimeout = setTimeout(() => {
      console.warn('[Unified WebSocket] Heartbeat timeout, reconnecting...');
      this.heliusWs?.close();
    }, HEARTBEAT_TIMEOUT);
  }

  private cleanupHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private async handleAccountUpdate(data: any) {
    if (!data?.signature) return;

    try {
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);
      const [status] = await connection.getSignatureStatuses([data.signature]);

      if (!status?.confirmationStatus) return;

      const tx = await connection.getTransaction(data.signature, {
        maxSupportedTransactionVersion: 0
      });

      if (!tx?.meta) return;

      const accountKeys = tx.transaction.message.accountKeys;
      const isTokenTx = accountKeys.some(key =>
        key.equals(new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'))
      );

      if (!isTokenTx) return;

      const preTokenBalances = tx.meta.preTokenBalances || [];
      const postTokenBalances = tx.meta.postTokenBalances || [];

      for (const tokenAccount of [...preTokenBalances, ...postTokenBalances]) {
        if (!tokenAccount) continue;

        const preAmount = preTokenBalances.find(
          b => b.accountIndex === tokenAccount.accountIndex
        )?.uiTokenAmount.uiAmount || 0;

        const postAmount = postTokenBalances.find(
          b => b.accountIndex === tokenAccount.accountIndex
        )?.uiTokenAmount.uiAmount || 0;

        const amount = Math.abs(postAmount - preAmount);
        if (amount === 0) continue;

        const isBuy = postAmount > preAmount;
        const solAmount = Math.abs(tx.meta.preBalances[0] - tx.meta.postBalances[0]) / 1e9;

        // Create trades for both sides of the transaction
        if (isBuy) {
          const buyTrade: TokenTrade = {
            signature: data.signature,
            timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
            tokenAddress: data.accountId,
            amount: solAmount,
            price: amount,
            priceUsd: 0,
            buyer: accountKeys[1]?.toString() || '',
            seller: accountKeys[0]?.toString() || '',
            type: 'buy'
          };
          useUnifiedTokenStore.getState().addTransaction(data.accountId, buyTrade);
        } else {
          const sellTrade: TokenTrade = {
            signature: data.signature,
            timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
            tokenAddress: data.accountId,
            amount: solAmount,
            price: amount,
            priceUsd: 0,
            buyer: accountKeys[1]?.toString() || '',
            seller: accountKeys[0]?.toString() || '',
            type: 'sell'
          };
          useUnifiedTokenStore.getState().addTransaction(data.accountId, sellTrade);
        }
      }
    } catch (error) {
      console.error('[Unified WebSocket] Account update error:', error);
    }
  }

  disconnect() {
    console.log('[Unified WebSocket] Disconnecting...');
    this.isManualDisconnect = true;
    this.cleanupHeartbeat();

    if (this.heliusWs) {
      this.heliusWs.close();
      this.heliusWs = null;
    }

    if (this.pumpPortalWs) {
      this.pumpPortalWs.close();
      this.pumpPortalWs = null;
    }

    useUnifiedTokenStore.getState().setConnected(false);
  }
}

export const unifiedWebSocket = new UnifiedWebSocket();