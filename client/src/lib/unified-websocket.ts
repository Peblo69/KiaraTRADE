
import { useUnifiedTokenStore } from './unified-token-store';
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';

// Constants
const HELIUS_API_KEY = '004f9b13-f526-4952-9998-52f5c7bec6ee';
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const PUMPPPORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 10000; // 10 seconds

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
  private heliusHeartbeatInterval: NodeJS.Timeout | null = null;
  private heliusHeartbeatTimeout: NodeJS.Timeout | null = null;
  private pumpPortalHeartbeatInterval: NodeJS.Timeout | null = null;
  private pumpPortalHeartbeatTimeout: NodeJS.Timeout | null = null;
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
        this.startHeliusHeartbeat();
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
      this.pumpPortalWs = new WebSocket(PUMPPPORTAL_WS_URL);

      this.pumpPortalWs.onopen = () => {
        console.log('[Unified WebSocket] PumpPortal connected');
        this.pumpPortalReconnectAttempts = 0;
        this.startPumpPortalHeartbeat();
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

  private handleHeliusMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      if (data.method === 'accountNotification') {
        this.handleAccountUpdate(data.params.result);
      }

      if (data.method === 'pong') {
        this.resetHeliusHeartbeatTimeout();
      }
    } catch (error) {
      console.error('[Unified WebSocket] Helius message error:', error);
    }
  }

  private async handlePumpPortalMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const store = useUnifiedTokenStore.getState();

      if (data.message?.includes('Successfully subscribed')) {
        this.requestAllTokenUpdates();
        return;
      }

      if (data.errors) {
        console.error('[Unified WebSocket] PumpPortal error:', data.errors);
        return;
      }

      if (data.txType === 'create' && data.mint) {
        try {
          const token = await this.mapPumpPortalData(data);
          if (!token) return;

          store.addToken(token);
          if (token.imageUrl) {
            this.preloadTokenImages([{
              imageLink: token.imageUrl,
              symbol: token.symbol
            }]);
          }

          if (this.pumpPortalWs?.readyState === WebSocket.OPEN) {
            this.pumpPortalWs.send(JSON.stringify({
              method: "subscribeTokenTrade",
              keys: [token.address]
            }));
          }
          // Subscribe to token trades for new token
          if (this.pumpPortalWs?.readyState === WebSocket.OPEN) {
            this.pumpPortalWs.send(JSON.stringify({
              method: "subscribeTokenTrade",
              keys: [token.address]
            }));
          }
        } catch (err) {
          console.error('[PumpPortal] Failed to process token:', err);
        }
      } else if (['buy', 'sell'].includes(data.txType) && data.mint) {
        if (typeof store.addTransaction === 'function') {
          store.addTransaction(data.mint, {
            signature: data.signature,
            timestamp: Date.now(),
            tokenAddress: data.mint,
            amount: data.solAmount || 0,
            price: data.price || 0,
            priceUsd: data.priceUSD || 0,
            buyer: data.traderPublicKey || '',
            seller: '',
            type: data.txType
          });
        } else {
          console.warn('[PumpPortal] Trade handling not implemented in store');
        }
      }
    } catch (error) {
      console.error('[Unified WebSocket] PumpPortal message error:', error);
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

        const trade: TokenTrade = {
          signature: data.signature,
          timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
          tokenAddress: data.accountId,
          amount: solAmount,
          price: amount,
          priceUsd: 0,
          buyer: isBuy ? accountKeys[1]?.toString() || '' : '',
          seller: !isBuy ? accountKeys[0]?.toString() || '' : '',
          type: isBuy ? 'buy' : 'sell'
        };

        useUnifiedTokenStore.getState().addTransaction(data.accountId, trade);
      }
    } catch (error) {
      console.error('[Unified WebSocket] Account update error:', error);
    }
  }

  private handleHeliusClose() {
    this.cleanupHeliusHeartbeat();
    useUnifiedTokenStore.getState().setConnected(false);

    if (!this.isManualDisconnect && this.heliusReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, this.heliusReconnectAttempts), 30000);
      this.heliusReconnectAttempts++;
      console.log(`[Unified WebSocket] Helius reconnecting ${this.heliusReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
      setTimeout(() => this.connectHelius(), delay);
    }
  }

  private handlePumpPortalClose() {
    this.cleanupPumpPortalHeartbeat();

    if (!this.isManualDisconnect && this.pumpPortalReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, this.pumpPortalReconnectAttempts), 30000);
      this.pumpPortalReconnectAttempts++;
      
      console.log(
        `[Unified WebSocket] PumpPortal reconnecting ${this.pumpPortalReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`,
        `(${useUnifiedTokenStore.getState().tokens.length} tokens to resubscribe)`
      );

      // Schedule reconnection
      setTimeout(() => {
        this.connectPumpPortal();
        // After connection is established, subscriptions will be restored via onopen handler
      }, delay);
    } else if (this.pumpPortalReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[Unified WebSocket] Max reconnection attempts reached for PumpPortal');
      // Could trigger a UI notification here if needed
    }
  }

  private startHeliusHeartbeat() {
    if (this.heliusHeartbeatInterval) return;

    this.heliusHeartbeatInterval = setInterval(() => {
      if (this.heliusWs?.readyState === WebSocket.OPEN) {
        this.heliusWs.send(JSON.stringify({ method: 'ping' }));
        this.resetHeliusHeartbeatTimeout();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private startPumpPortalHeartbeat() {
    if (this.pumpPortalHeartbeatInterval) return;

    this.pumpPortalHeartbeatInterval = setInterval(() => {
      if (this.pumpPortalWs?.readyState === WebSocket.OPEN) {
        this.pumpPortalWs.send(JSON.stringify({ method: 'ping' }));
        this.resetPumpPortalHeartbeatTimeout();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private resetHeliusHeartbeatTimeout() {
    if (this.heliusHeartbeatTimeout) {
      clearTimeout(this.heliusHeartbeatTimeout);
    }

    this.heliusHeartbeatTimeout = setTimeout(() => {
      console.warn('[Unified WebSocket] Heartbeat timeout, reconnecting...');
      this.heliusWs?.close();
    }, HEARTBEAT_TIMEOUT);
  }

  private resetPumpPortalHeartbeatTimeout() {
    if (this.pumpPortalHeartbeatTimeout) {
      clearTimeout(this.pumpPortalHeartbeatTimeout);
    }

    this.pumpPortalHeartbeatTimeout = setTimeout(() => {
      console.warn('[Unified WebSocket] PumpPortal heartbeat timeout, reconnecting...');
      this.pumpPortalWs?.close();
    }, HEARTBEAT_TIMEOUT);
  }

  private cleanupHeliusHeartbeat() {
    if (this.heliusHeartbeatInterval) {
      clearInterval(this.heliusHeartbeatInterval);
      this.heliusHeartbeatInterval = null;
    }
    if (this.heliusHeartbeatTimeout) {
      clearTimeout(this.heliusHeartbeatTimeout);
      this.heliusHeartbeatTimeout = null;
    }
  }

  private cleanupPumpPortalHeartbeat() {
    if (this.pumpPortalHeartbeatInterval) {
      clearInterval(this.pumpPortalHeartbeatInterval);
      this.pumpPortalHeartbeatInterval = null;
    }
    if (this.pumpPortalHeartbeatTimeout) {
      clearTimeout(this.pumpPortalHeartbeatTimeout);
      this.pumpPortalHeartbeatTimeout = null;
    }
  }

  private subscribeToPumpPortal() {
    if (this.pumpPortalWs?.readyState !== WebSocket.OPEN) return;

    try {
      // Subscribe to new tokens
      this.pumpPortalWs.send(JSON.stringify({
        method: "subscribeNewToken"
      }));

      const store = useUnifiedTokenStore.getState();
      const existingTokens = store.tokens.map(t => t.address);
      const activeToken = store.activeToken;

      // Subscribe to active token first if exists
      if (activeToken && existingTokens.includes(activeToken)) {
        this.pumpPortalWs.send(JSON.stringify({
          method: "subscribeTokenTrade",
          keys: [activeToken]
        }));
      }

      // Subscribe to other tokens in batches
      const batchSize = 50;
      const otherTokens = existingTokens.filter(t => t !== activeToken);
      
      for (let i = 0; i < otherTokens.length; i += batchSize) {
        const batch = otherTokens.slice(i, i + batchSize);
        if (batch.length > 0) {
          setTimeout(() => {
            if (this.pumpPortalWs?.readyState === WebSocket.OPEN) {
              this.pumpPortalWs.send(JSON.stringify({
                method: "subscribeTokenTrade",
                keys: batch
              }));
            }
          }, i * 100); // Delay each batch by 100ms to prevent overwhelming the server
        }
      }
    } catch (error) {
      console.error('[Unified WebSocket] Error subscribing to PumpPortal:', error);
    }
  }

  private requestAllTokenUpdates() {
    const store = useUnifiedTokenStore.getState();
    const tokens = store.tokens;
    const activeToken = store.activeToken;
    
    if (this.pumpPortalWs?.readyState === WebSocket.OPEN) {
      if (activeToken) {
        this.pumpPortalWs.send(JSON.stringify({
          method: "subscribeTokenTrade",
          keys: [activeToken]
        }));
      }
      
      if (tokens.length > 0) {
        const otherTokens = tokens
          .filter(t => t.address !== activeToken)
          .map(t => t.address);
          
        if (otherTokens.length > 0) {
          // Subscribe in batches to prevent overwhelming server
          const batchSize = 10;
          for (let i = 0; i < otherTokens.length; i += batchSize) {
            const batch = otherTokens.slice(i, i + batchSize);
            setTimeout(() => {
              if (this.pumpPortalWs?.readyState === WebSocket.OPEN) {
                this.pumpPortalWs.send(JSON.stringify({
                  method: "subscribeTokenTrade",
                  keys: batch
                }));
              }
            }, i * 100);
          }
        }
      }
    }
  }

  private preloadTokenImages(tokens: { imageLink: string, symbol: string }[]) {
    tokens.forEach(token => {
      const img = new Image();
      img.src = token.imageLink;
      img.onerror = () => {
        console.warn(`[Token Metadata] Failed to load image for token: ${token.symbol}`);
      };
    });
  }

  private async mapPumpPortalData(data: any) {
    try {
      const {
        mint,
        vSolInBondingCurve,
        marketCapSol,
        name,
        symbol,
        imageLink,
      } = data;

      return {
        name: name || `Token ${mint?.slice(0, 8)}`,
        symbol: symbol || mint?.slice(0, 6),
        address: mint,
        marketCap: marketCapSol || 0,
        liquidityAdded: Boolean(vSolInBondingCurve),
        holders: 0,
        volume24h: 0,
        price: 0,
        imageUrl: imageLink || 'https://via.placeholder.com/150',
        source: 'unified'
      };
    } catch (error) {
      console.error('[PumpPortal] Error mapping data:', error);
      return null;
    }
  }

  disconnect() {
    console.log('[Unified WebSocket] Disconnecting...');
    this.isManualDisconnect = true;

    this.cleanupHeliusHeartbeat();
    this.cleanupPumpPortalHeartbeat();

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
unifiedWebSocket.connect();
