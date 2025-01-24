import { useUnifiedTokenStore } from './unified-token-store';
import { Connection, PublicKey } from '@solana/web3.js';

const HELIUS_API_KEY = '004f9b13-f526-4952-9998-52f5c7bec6ee';
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

class UnifiedWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private isManualDisconnect = false;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      console.log('[UnifiedWebSocket] Initializing connection...');
      this.ws = new WebSocket(HELIUS_WS_URL);

      this.ws.onopen = () => {
        console.log('[UnifiedWebSocket] Connected');
        this.reconnectAttempts = 0;
        useUnifiedTokenStore.getState().setConnected(true);
      };

      this.ws.onclose = () => {
        useUnifiedTokenStore.getState().setConnected(false);
        if (!this.isManualDisconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          console.log(`[UnifiedWebSocket] Attempting reconnect ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          setTimeout(() => this.connect(), RECONNECT_DELAY * Math.pow(1.5, this.reconnectAttempts));
        }
      };

      this.ws.onerror = (error) => {
        console.error('[UnifiedWebSocket] Error:', error);
        useUnifiedTokenStore.getState().setError('WebSocket connection error');
      };

      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error('[UnifiedWebSocket] Connection failed:', error);
      useUnifiedTokenStore.getState().setError('Failed to establish WebSocket connection');
    }
  }

  private async handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      if (data.method === 'accountNotification') {
        await this.processTransaction(data.params.result);
      }
    } catch (error) {
      console.error('[UnifiedWebSocket] Message processing error:', error);
    }
  }

  private async processTransaction(data: any) {
    if (!data?.signature) return;

    try {
      const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`);
      const [status] = await connection.getSignatureStatuses([data.signature]);

      if (!status?.confirmationStatus) return;

      const tx = await connection.getTransaction(data.signature, {
        maxSupportedTransactionVersion: 0
      });

      if (!tx?.meta) return;

      useUnifiedTokenStore.getState().addTransaction(data.accountId, {
        signature: data.signature,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
        tokenAddress: data.accountId,
        solAmount: Math.abs(tx.meta.preBalances[0] - tx.meta.postBalances[0]) / 1e9,
        type: 'trade'
      });
    } catch (error) {
      console.error('[UnifiedWebSocket] Transaction processing error:', error);
    }
  }

  disconnect() {
    console.log('[UnifiedWebSocket] Disconnecting...');
    this.isManualDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const unifiedWebSocket = new UnifiedWebSocket();