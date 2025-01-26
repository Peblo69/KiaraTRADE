import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { WebSocketRequest } from "./types";
import { config } from "./config";
import { fetchTransactionDetails, createSwapTransaction, getRugCheckConfirmed, fetchAndSaveSwapDetails } from "./transactions";
import { validateEnv } from "./utils/env-validator";
import WebSocket from "ws";
import { TokenMonitor } from "./monitor";
import { format } from 'date-fns';

// WebSocket and Transaction Queue Configuration
const WS_CONFIG = {
  MAX_CONCURRENT: 1,
  BATCH_SIZE: 2,
  BATCH_INTERVAL: 60000,
  MAX_QUEUE_SIZE: 50,
  MAX_WS_RETRIES: 5,
  WS_RETRY_DELAY: 30000,
  MAX_REQUESTS_PER_MINUTE: 10
};

class EnhancedTokenMonitor extends TokenMonitor {
  private wsRetryCount = 0;
  private activeWs: WebSocket | null = null;
  private wsConnecting = false;
  private processingBatch = false;
  private pendingTransactions: string[] = [];
  private requestCount = 0;
  private lastReset = Date.now();

  constructor() {
    super();
    this.initializeRateLimitReset();
  }

  private initializeRateLimitReset(): void {
    setInterval(() => {
      this.requestCount = 0;
      this.lastReset = Date.now();
      console.log("🔄 Request counter reset");
    }, 60000);
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const timeElapsedSinceReset = now - this.lastReset;

    if (timeElapsedSinceReset > 60000) {
      this.requestCount = 0;
      this.lastReset = now;
      return true;
    }

    if (this.requestCount >= WS_CONFIG.MAX_REQUESTS_PER_MINUTE) {
      console.log(`⚠️ Rate limit reached (${this.requestCount}/${WS_CONFIG.MAX_REQUESTS_PER_MINUTE} requests)`);
      return false;
    }

    this.requestCount++;
    return true;
  }

  private initializeWebSocket(): void {
    if (this.wsConnecting || this.activeWs?.readyState === WebSocket.OPEN) {
      return;
    }

    this.wsConnecting = true;
    const env = validateEnv();

    if (this.activeWs) {
      try {
        this.activeWs.close();
      } catch (err) {
        console.log("Error closing existing WebSocket:", err);
      }
      this.activeWs = null;
    }

    const ws = new WebSocket(env.HELIUS_WSS_URI, {
      handshakeTimeout: 10000,
      maxPayload: 50 * 1024 * 1024
    });

    this.setupWebSocketListeners(ws);
  }

  private setupWebSocketListeners(ws: WebSocket): void {
    ws.on("open", () => {
      console.log("✅ WebSocket connected successfully");
      this.wsRetryCount = 0;
      this.wsConnecting = false;
      this.activeWs = ws;
      this.sendSubscribeRequest(ws);
    });

    ws.on("message", async (data: WebSocket.Data) => {
      await this.handleWebSocketMessage(data);
    });

    ws.on("error", (error: Error) => {
      console.error("🚫 WebSocket error:", error.message);
      this.wsConnecting = false;
    });

    ws.on("close", (code: number, reason: string) => {
      this.handleWebSocketClose(code, reason);
    });
  }

  private sendSubscribeRequest(ws: WebSocket): void {
    const request: WebSocketRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "logsSubscribe",
      params: [
        {
          mentions: [config.liquidity_pool.radiyum_program_id],
        },
        {
          commitment: "confirmed",
        },
      ],
    };
    ws.send(JSON.stringify(request));
  }

  private async handleWebSocketMessage(data: WebSocket.Data): Promise<void> {
    try {
      const jsonString = data.toString();
      const parsedData = JSON.parse(jsonString);

      if (!this.validateWebSocketMessage(parsedData)) {
        return;
      }

      const signature = parsedData.params?.result?.value?.signature;
      if (this.shouldProcessTransaction(signature)) {
        await this.queueTransaction(signature);
      }
    } catch (error) {
      console.error("💥 Error processing message:", error);
    }
  }

  private validateWebSocketMessage(parsedData: any): boolean {
    if (parsedData.result !== undefined && !parsedData.error) {
      console.log("✅ Subscription confirmed");
      return false;
    }

    if (parsedData.error) {
      console.error("🚫 RPC Error:", parsedData.error);
      return false;
    }

    const logs = parsedData?.params?.result?.value?.logs;
    const signature = parsedData?.params?.result?.value?.signature;

    return Array.isArray(logs) && signature && this.isValidSignature(signature);
  }

  private shouldProcessTransaction(signature: string): boolean {
    return !this.pendingTransactions.includes(signature) &&
           this.pendingTransactions.length < WS_CONFIG.MAX_QUEUE_SIZE;
  }

  private async queueTransaction(signature: string): Promise<void> {
    if (this.pendingTransactions.length >= WS_CONFIG.MAX_QUEUE_SIZE) {
      this.pendingTransactions.pop();
    }

    this.pendingTransactions.push(signature);
    console.log(`📝 Queued transaction ${signature} (${this.pendingTransactions.length}/${WS_CONFIG.MAX_QUEUE_SIZE} pending)`);

    if (!this.processingBatch) {
      await this.processPendingTransactions();
    }
  }

  private async processPendingTransactions(): Promise<void> {
    if (this.processingBatch || this.pendingTransactions.length === 0) return;

    if (!this.checkRateLimit()) {
      setTimeout(() => this.processPendingTransactions(), 5000);
      return;
    }

    this.processingBatch = true;
    const batchSize = Math.min(WS_CONFIG.BATCH_SIZE, this.pendingTransactions.length);
    const batch = this.pendingTransactions.splice(0, batchSize);

    for (const signature of batch) {
      try {
        if (!this.checkRateLimit()) {
          this.pendingTransactions.unshift(signature);
          break;
        }
        await super.processTransaction(signature);
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        console.error(`Error processing transaction ${signature}:`, error);
      }
    }

    this.processingBatch = false;

    if (this.pendingTransactions.length > 0) {
      const nextBatchDelay = Math.max(
        WS_CONFIG.BATCH_INTERVAL,
        (60000 - (Date.now() - this.lastReset))
      );
      setTimeout(() => this.processPendingTransactions(), nextBatchDelay);
    }
  }

  private handleWebSocketClose(code: number, reason: string): void {
    console.log(`📴 WebSocket closed (${code}): ${reason || 'No reason provided'}`);
    this.wsConnecting = false;
    this.activeWs = null;

    if (this.wsRetryCount < WS_CONFIG.MAX_WS_RETRIES) {
      this.wsRetryCount++;
      console.log(`🔄 Attempting reconnection ${this.wsRetryCount}/${WS_CONFIG.MAX_WS_RETRIES} in ${WS_CONFIG.WS_RETRY_DELAY/1000}s...`);
      setTimeout(() => this.initializeWebSocket(), WS_CONFIG.WS_RETRY_DELAY);
    } else {
      console.error("❌ Max reconnection attempts reached. Please restart the application.");
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    console.clear();
    console.log(`\n🚀 Starting Enhanced Solana Token Monitor...`);
    console.log(`Current Time (UTC): ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
    console.log(`User: ${process.env.USER || 'Peblo69'}\n`);

    console.log("⚡ Rate Limits:");
    console.log(`   Max Requests/min: ${WS_CONFIG.MAX_REQUESTS_PER_MINUTE}`);
    console.log(`   Batch Size: ${WS_CONFIG.BATCH_SIZE}`);
    console.log(`   Batch Interval: ${WS_CONFIG.BATCH_INTERVAL/1000}s`);
    console.log(`   Max Queue Size: ${WS_CONFIG.MAX_QUEUE_SIZE}\n`);

    await super.start();
    this.initializeWebSocket();
  }
}

// Start the enhanced monitor
const monitor = new EnhancedTokenMonitor();
monitor.start().catch(error => {
  console.error("Fatal error during startup:", error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down monitor...');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});