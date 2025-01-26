import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
import { config } from "./config";
import { fetchTransactionDetails, getRugCheckConfirmed } from "./transactions";
import { format } from 'date-fns';

dotenv.config();

interface SignatureInfo {
  timestamp: number;
  signature: string;
}

class TransactionQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private readonly maxConcurrent: number;

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  async add(task: () => Promise<void>) {
    this.queue.push(task);
    await this.process();
  }

  private async process() {
    if (this.running >= this.maxConcurrent) return;

    while (this.queue.length && this.running < this.maxConcurrent) {
      const task = this.queue.shift();
      if (!task) continue;

      this.running++;
      try {
        await task();
      } finally {
        this.running--;
        await this.process();
      }
    }
  }
}

class TokenMonitor {
  private connection: Connection | null = null;
  private lastConnectionAttempt = 0;
  private readonly CONNECTION_COOLDOWN = 30000;
  private readonly processedSignatures = new Map<string, number>();
  private readonly eventTimestamps: number[] = [];
  private readonly MAX_EVENTS_PER_MINUTE = 30;
  private readonly RATE_LIMIT_WINDOW = 60000;
  private readonly transactionQueue: TransactionQueue;
  private subscriptionId: number | null = null;
  private isProcessing = false;
  private retryDelay = 1000;
  private maxRetries = 3;
  private readonly username: string;

  constructor() {
    this.transactionQueue = new TransactionQueue(2);
    this.initializeCleanupTasks();
    this.username = process.env.USER || 'Peblo69'; // Default to Peblo69 if not set
  }

  private formatTime(): string {
    return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  }

  private initializeCleanupTasks(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [sig, timestamp] of this.processedSignatures.entries()) {
        if (now - timestamp > 1800000) {
          this.processedSignatures.delete(sig);
        }
      }
    }, 300000);
  }

  private async waitForRateLimit(): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW;

    while (this.eventTimestamps.length > 0 && this.eventTimestamps[0] < windowStart) {
      this.eventTimestamps.shift();
    }

    if (this.eventTimestamps.length >= this.MAX_EVENTS_PER_MINUTE) {
      const oldestTimestamp = this.eventTimestamps[0];
      const waitTime = oldestTimestamp + this.RATE_LIMIT_WINDOW - now;
      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${(waitTime / 1000).toFixed(1)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForRateLimit();
      }
    }

    this.eventTimestamps.push(now);
    return true;
  }

  private isValidSignature(signature: string): boolean {
    if (!signature || !signature.match(/^[1-9A-HJ-NP-Za-km-z]{88,98}$/)) {
      console.log("⚠️ Invalid signature format:", signature);
      return false;
    }

    if (this.processedSignatures.has(signature)) {
      console.log("⚠️ Duplicate signature, skipping");
      return false;
    }

    const invalidPatterns = ['pump', 'test', 'spam', 'invalid'];
    if (invalidPatterns.some(pattern => signature.toLowerCase().includes(pattern))) {
      console.log("⚠️ Invalid signature pattern detected");
      return false;
    }

    return true;
  }

  private async validateConfig(): Promise<void> {
    if (!process.env.HELIUS_API_KEY) {
      throw new Error("HELIUS_API_KEY not found in environment variables");
    }
    if (!config.swap.amount || config.swap.amount <= 0) {
      throw new Error("Invalid swap amount configured");
    }
    if (!config.liquidity_pool.radiyum_program_id) {
      throw new Error("Missing Raydium program ID");
    }
  }

  private async establishConnection(): Promise<boolean> {
    try {
      const now = Date.now();
      if (now - this.lastConnectionAttempt < this.CONNECTION_COOLDOWN) {
        console.log(`⏳ Waiting ${((this.CONNECTION_COOLDOWN - (now - this.lastConnectionAttempt))/1000).toFixed(1)}s before next connection attempt...`);
        return false;
      }

      this.lastConnectionAttempt = now;

      if (this.connection && this.subscriptionId !== null) {
        await this.connection.removeAccountChangeListener(this.subscriptionId);
        this.connection = null;
        this.subscriptionId = null;
      }

      const connection = new Connection(
        `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
        'confirmed'
      );

      await connection.getLatestBlockhash();
      this.connection = connection;
      return true;
    } catch (error) {
      console.error("Failed to establish connection:", error);
      return false;
    }
  }

  private async processTransaction(signature: string): Promise<void> {
    if (this.isProcessing) {
      console.log("Already processing a transaction, skipping...");
      return;
    }

    this.isProcessing = true;
    let retryCount = 0;

    try {
      console.log(`\n🔔 [${this.formatTime()}] New Token Event Detected!`);
      console.log(`   User: ${this.username}`);
      console.log("   Analyzing transaction...");

      while (retryCount < this.maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} of ${this.maxRetries} to fetch transaction details...`);

          await this.waitForRateLimit();

          const mints = await fetchTransactionDetails(signature);
          if (!mints || !mints.tokenMint) {
            throw new Error("Invalid transaction data");
          }

          console.log(`\n📊 Token Analysis:`);
          console.log(`   Address: ${mints.tokenMint}`);

          await this.waitForRateLimit();

          const isRugSafe = await getRugCheckConfirmed(mints.tokenMint);

          if (isRugSafe) {
            console.log("✅ Token passed all safety checks!");
            this.printTradeInfo();
          } else {
            console.log("❌ Token failed safety checks");
          }

          console.log("\n-----------------------------------");
          break;

        } catch (error) {
          retryCount++;
          if (retryCount >= this.maxRetries) {
            throw error;
          }
          console.log(`Retry attempt ${retryCount} failed, waiting ${this.retryDelay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          this.retryDelay *= 2;
        }
      }

    } catch (error) {
      console.error("Error processing transaction:", error);
    } finally {
      this.isProcessing = false;
      this.retryDelay = 1000;
    }
  }

  private printTradeInfo(): void {
    console.log("\n💰 Trade Simulation:");
    console.log(`   Buy Amount: ${parseInt(config.swap.amount)/1e9} SOL`);
    console.log(`   Max Slippage: ${config.swap.slippageBps/100}%`);

    if (config.swap.simulation_mode) {
      console.log("\n⚠️ SIMULATION MODE - No real trades will be executed");
    }

    console.log(`   Auto-sell Enabled: ${config.sell.auto_sell}`);
    if (config.sell.auto_sell) {
      console.log(`   Stop Loss: -${config.sell.stop_loss_percent}%`);
      console.log(`   Take Profit: +${config.sell.take_profit_percent}%`);
    }
  }

  private printConfiguration(): void {
    console.log("\n✅ Safety Settings:");
    console.log(`   Max Trade Amount: ${parseInt(config.swap.amount)/1e9} SOL`);
    console.log(`   Stop Loss: ${config.sell.stop_loss_percent}%`);
    console.log(`   Take Profit: ${config.sell.take_profit_percent}%`);
    console.log(`   Priority Fee: ${config.swap.prio_fee_max_lamports/1e6} SOL`);
    console.log("\n🔒 Rug Check Settings:");
    console.log(`   Block Mutable Tokens: ${!config.rug_check.allow_mutable}`);
    console.log(`   Block Mint Authority: ${!config.rug_check.allow_mint_authority}`);
    console.log(`   Block Freeze Authority: ${!config.rug_check.allow_freeze_authority}`);
    console.log(`   Min Market Liquidity: ${config.rug_check.min_total_market_Liquidity} SOL`);
  }

  public async start(): Promise<void> {
    try {
      await this.validateConfig();

      console.log("\n🚀 Starting Solana Token Monitor...");
      console.log(`📅 Current Time (UTC): ${this.formatTime()}`);
      console.log(`👤 User: ${this.username}`);
      this.printConfiguration();

      while (!this.connection) {
        if (!await this.establishConnection()) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
      }

      this.subscriptionId = this.connection.onProgramAccountChange(
        new PublicKey(config.liquidity_pool.radiyum_program_id),
        async (keyedAccountInfo, context) => {
          try {
            const signatures = await this.connection?.getSignaturesForAddress(
              new PublicKey(config.liquidity_pool.radiyum_program_id),
              { limit: 1 },
              'confirmed'
            );

            if (!signatures || signatures.length === 0) {
              return;
            }

            const signature = signatures[0].signature;
            if (!this.isValidSignature(signature)) return;

            this.processedSignatures.set(signature, Date.now());
            await this.transactionQueue.add(() => this.processTransaction(signature));

          } catch (error) {
            console.error("Error in account change handler:", error);
          }
        }
      );

      console.log("\n👀 Monitoring for new tokens...");
      console.log("Press Ctrl+C to stop\n");

    } catch (error) {
      console.error("Fatal error:", error);
      process.exit(1);
    }
  }
}

// Start the monitor
console.log(`\n🔄 Initializing Solana Token Monitor...`);
const monitor = new TokenMonitor();
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