import { Connection, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
import { config } from "./config";
import { fetchTransactionDetails, getRugCheckConfirmed } from "./transactions";

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
  private readonly MAX_EVENTS_PER_MINUTE = 20;
  private readonly transactionQueue: TransactionQueue;
  private subscriptionId: number | null = null;

  constructor() {
    this.transactionQueue = new TransactionQueue(2);
    this.initializeCleanupTasks();
  }

  private formatTime(): string {
    return new Date().toISOString().replace('T', ' ').substr(0, 19);
  }

  private initializeCleanupTasks(): void {
    // Cleanup old signatures every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [sig, timestamp] of this.processedSignatures.entries()) {
        if (now - timestamp > 1800000) { // 30 minutes
          this.processedSignatures.delete(sig);
        }
      }
    }, 300000);
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove events older than 1 minute
    while (this.eventTimestamps.length && this.eventTimestamps[0] < oneMinuteAgo) {
      this.eventTimestamps.shift();
    }

    return this.eventTimestamps.length >= this.MAX_EVENTS_PER_MINUTE;
  }

  private isValidSignature(signature: string): boolean {
    // Validate basic format (base58 characters and length)
    if (!signature || !signature.match(/^[1-9A-HJ-NP-Za-km-z]{88,98}$/)) {
      console.log("⚠️ Invalid signature format:", signature);
      return false;
    }

    // Skip if already processed
    if (this.processedSignatures.has(signature)) {
      console.log("⚠️ Duplicate signature, skipping");
      return false;
    }

    // Check specific patterns that indicate invalid/spam transactions
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
    // Add more validation as needed
  }

  private async establishConnection(): Promise<boolean> {
    try {
      const now = Date.now();
      if (now - this.lastConnectionAttempt < this.CONNECTION_COOLDOWN) {
        console.log(`⏳ Waiting ${((this.CONNECTION_COOLDOWN - (now - this.lastConnectionAttempt))/1000).toFixed(1)}s before next connection attempt...`);
        return false;
      }

      this.lastConnectionAttempt = now;

      // Cleanup existing connection
      if (this.connection && this.subscriptionId !== null) {
        await this.connection.removeAccountChangeListener(this.subscriptionId);
        this.connection = null;
        this.subscriptionId = null;
      }

      const connection = new Connection(
        `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
        'confirmed'
      );

      // Test connection
      await connection.getLatestBlockhash();
      this.connection = connection;
      return true;
    } catch (error) {
      console.error("Failed to establish connection:", error);
      return false;
    }
  }

  private async processTransaction(signature: string): Promise<void> {
    try {
      console.log(`\n🔔 [${this.formatTime()}] New Token Event Detected!`);
      console.log("   Analyzing transaction...");

      const mints = await fetchTransactionDetails(signature);
      if (!mints || !mints.tokenMint) {
        console.log("❌ Invalid transaction data");
        return;
      }

      console.log(`\n📊 Token Analysis:`);
      console.log(`   Address: ${mints.tokenMint}`);

      // Run rug check with detailed output
      console.log("\n🔍 Running Safety Checks...");
      const isRugSafe = await getRugCheckConfirmed(mints.tokenMint);

      if (isRugSafe) {
        console.log("✅ Token passed all safety checks!");
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
      } else {
        console.log("❌ Token failed safety checks");
      }

      console.log("\n-----------------------------------");
    } catch (error) {
      console.error("Error processing transaction:", error);
    }
  }

  public async start(): Promise<void> {
    try {
      await this.validateConfig();

      console.log("\n🚀 Starting Solana Token Monitor...");
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
            if (this.isRateLimited()) {
              console.log("⚠️ Rate limit reached, skipping event");
              return;
            }
            this.eventTimestamps.push(Date.now());

            const signatures = await this.connection?.getSignaturesForAddress(
              new PublicKey(config.liquidity_pool.radiyum_program_id),
              { limit: 1 },
              'confirmed'
            );

            if (!signatures || signatures.length === 0) {
              console.log("⚠️ No recent signatures found");
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
}

// Start the monitor
const monitor = new TokenMonitor();
monitor.start().catch(console.error);