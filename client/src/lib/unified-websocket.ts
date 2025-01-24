import { useUnifiedTokenStore } from './unified-token-store';
import { Connection, PublicKey } from '@solana/web3.js';
import { preloadTokenImages } from './token-metadata';
import { mapPumpPortalData } from './pump-portal-websocket';

const HELIUS_API_KEY = '004f9b13-f526-4952-9998-52f5c7bec6ee';
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const PUMP_PORTAL_WS_URL = 'wss://api.pump.fun/stream';

const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

class UnifiedWebSocket {
  private heliusWs: WebSocket | null = null;
  private pumpPortalWs: WebSocket | null = null;
  private heliusReconnectAttempts = 0;
  private pumpPortalReconnectAttempts = 0;
  private isManualDisconnect = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;


  constructor() {
    this.connectHelius();
    this.connectPumpPortal();
  }

  private connectHelius() {
    try {
      console.log('[Helius] Initializing WebSocket...');
      this.heliusWs = new WebSocket(HELIUS_WS_URL);
      this.heliusWs.onopen = () => {
        console.log('[Helius] Connected');
        this.heliusReconnectAttempts = 0;
        useUnifiedTokenStore.getState().setHeliusConnected(true);
        this.startHeartbeat();
      };
      this.heliusWs.onclose = this.handleHeliusClose.bind(this);
      this.heliusWs.onmessage = this.handleHeliusMessage.bind(this);
      this.heliusWs.onerror = (error) => {
        console.error('[Helius] WebSocket error:', error);
        this.heliusWs?.close();
      };
    } catch (error) {
      console.error('[Helius] Connection failed:', error);
    }
  }

  private connectPumpPortal() {
    try {
      console.log('[PumpPortal] Initializing WebSocket...');
      this.pumpPortalWs = new WebSocket(PUMP_PORTAL_WS_URL);
      this.pumpPortalWs.onopen = () => {
        console.log('[PumpPortal] Connected');
        this.pumpPortalReconnectAttempts = 0;
        useUnifiedTokenStore.getState().setPumpPortalConnected(true);
      };
      this.pumpPortalWs.onmessage = this.handlePumpPortalMessage.bind(this);
      this.pumpPortalWs.onclose = this.handlePumpPortalClose.bind(this);
      this.pumpPortalWs.onerror = (error) => {
        console.error('[PumpPortal] WebSocket error:', error);
        this.pumpPortalWs?.close();
      };
    } catch (error) {
      console.error('[PumpPortal] Connection failed:', error);
    }
  }

  private handleHeliusClose() {
    this.cleanupHeartbeat();
    useUnifiedTokenStore.getState().setHeliusConnected(false);
    if (!this.isManualDisconnect && this.heliusReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, this.heliusReconnectAttempts), 30000);
      this.heliusReconnectAttempts++;
      console.log(`[Helius] Attempting reconnect ${this.heliusReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      setTimeout(() => this.connectHelius(), delay);
    }
  }

  private handlePumpPortalClose() {
    useUnifiedTokenStore.getState().setPumpPortalConnected(false);
    if (!this.isManualDisconnect && this.pumpPortalReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, this.pumpPortalReconnectAttempts), 30000);
      this.pumpPortalReconnectAttempts++;
      console.log(`[PumpPortal] Attempting reconnect ${this.pumpPortalReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      setTimeout(() => this.connectPumpPortal(), delay);
    }
  }

  private async handlePumpPortalMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'ping') {
        this.pumpPortalWs?.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      const store = useUnifiedTokenStore.getState();
      const token = mapPumpPortalData(data);
      if(token){
        store.addToken(token);
        await preloadTokenImages([{imageLink: token.imageLink, symbol: token.symbol}]);
      }

    } catch (error) {
      console.error('[PumpPortal] Message processing error:', error);
    }
  }
  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      if (this.heliusWs?.readyState === WebSocket.OPEN) {
        this.heliusWs.send(JSON.stringify({ method: 'ping' }));
        this.resetHeartbeatTimeout();
      }
    }, 30000);
  }

  private resetHeartbeatTimeout() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }

    this.heartbeatTimeout = setTimeout(() => {
      console.warn('[Unified WebSocket] Heartbeat timeout, reconnecting...');
      this.heliusWs?.close();
    }, 10000);
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
  }
}

export const unifiedWebSocket = new UnifiedWebSocket();