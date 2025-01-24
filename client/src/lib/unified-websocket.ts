
import { useUnifiedTokenStore } from './unified-token-store';
import { Connection, PublicKey } from '@solana/web3.js';
import { preloadTokenImages } from './token-metadata';
import { mapPumpPortalData } from './pump-portal-websocket';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '004f9b13-f526-4952-9998-52f5c7bec6ee';
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const PUMPPORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;

class UnifiedWebSocket {
  private heliusWs: WebSocket | null = null;
  private pumpPortalWs: WebSocket | null = null;
  private heliusReconnectAttempts = 0;
  private pumpPortalReconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private resubscribeInterval: NodeJS.Timeout | null = null;

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

  private subscribeToPumpPortal() {
    if (this.pumpPortalWs?.readyState !== WebSocket.OPEN) return;

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

  private handleHeliusClose() {
    this.cleanupHeartbeat();
    useUnifiedTokenStore.getState().setConnected(false);

    if (!this.isManualDisconnect && this.heliusReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, this.heliusReconnectAttempts), 30000);
      this.heliusReconnectAttempts++;
      console.log(`[Unified WebSocket] Helius reconnecting ${this.heliusReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
      setTimeout(() => this.connectHelius(), delay);
    }
  }

  private handlePumpPortalClose() {
    if (!this.isManualDisconnect && this.pumpPortalReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, this.pumpPortalReconnectAttempts), 30000);
      this.pumpPortalReconnectAttempts++;
      console.log(`[Unified WebSocket] PumpPortal reconnecting ${this.pumpPortalReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
      setTimeout(() => this.connectPumpPortal(), delay);
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

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.resubscribeInterval) {
      clearInterval(this.resubscribeInterval);
      this.resubscribeInterval = null;
    }

    useUnifiedTokenStore.getState().setConnected(false);
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

        if (isBuy) {
          useUnifiedTokenStore.getState().addTransaction(data.accountId, {
            signature: data.signature,
            timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
            tokenAddress: data.accountId,
            amount: solAmount,
            price: amount,
            priceUsd: 0,
            buyer: accountKeys[1]?.toString() || '',
            seller: accountKeys[0]?.toString() || '',
            type: 'buy'
          });
        } else {
          useUnifiedTokenStore.getState().addTransaction(data.accountId, {
            signature: data.signature,
            timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
            tokenAddress: data.accountId,
            amount: solAmount,
            price: amount,
            priceUsd: 0,
            buyer: accountKeys[1]?.toString() || '',
            seller: accountKeys[0]?.toString() || '',
            type: 'sell'
          });
        }
      }
    } catch (error) {
      console.error('[Unified WebSocket] Account update error:', error);
    }
  }

  private handlePumpPortalMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const store = useUnifiedTokenStore.getState();

      if (data.txType === 'create' && data.mint) {
        const token = mapPumpPortalData(data);
        if (!token) return;

        setTimeout(() => {
          store.addToken(token);

          if (token.imageLink) {
            preloadTokenImages([{
              imageLink: token.imageLink,
              symbol: token.symbol
            }]);
          }

          if (this.pumpPortalWs?.readyState === WebSocket.OPEN) {
            this.pumpPortalWs.send(JSON.stringify({
              method: "subscribeTokenTrade",
              keys: [token.address]
            }));
          }
        }, 100);
      } else if (['buy', 'sell'].includes(data.txType) && data.mint) {
        store.addTradeToHistory(data.mint, {
          ...data,
          timestamp: data.timestamp || Date.now()
        });
      }
    } catch (error) {
      console.error('[Unified WebSocket] PumpPortal message error:', error);
    }
  }
}

export const unifiedWebSocket = new UnifiedWebSocket();
