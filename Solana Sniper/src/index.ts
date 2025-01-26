import WebSocket from "ws";
import { WebSocketRequest } from "./types";
import { config } from "./config";
import { fetchTransactionDetails, createSwapTransaction, getRugCheckConfirmed, fetchAndSaveSwapDetails } from "./transactions";
import { validateEnv } from "./utils/env-validator";

// Regional Variables
let activeTransactions = 0;
const MAX_CONCURRENT = 1; // Only 1 concurrent transaction
const BATCH_SIZE = 2; // Process max 2 transactions per batch
const BATCH_INTERVAL = 30000; // 30 second interval between batches
let pendingTransactions: string[] = [];
let wsRetryCount = 0;
const MAX_WS_RETRIES = 5;
const WS_RETRY_DELAY = 5000;
let processingBatch = false;

// Rate limiting
const MAX_REQUESTS_PER_MINUTE = 100;
let requestCount = 0;
let lastReset = Date.now();

// Reset request counter every minute
setInterval(() => {
  requestCount = 0;
  lastReset = Date.now();
  console.log("🔄 Request counter reset");
}, 60000);

// Function to check rate limit
function checkRateLimit(): boolean {
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    console.log(`⚠️ Rate limit reached (${requestCount}/${MAX_REQUESTS_PER_MINUTE} requests). Waiting for reset...`);
    return false;
  }
  requestCount++;
  return true;
}

// Function to validate transaction signature format
function isValidSignature(signature: string): boolean {
  // Solana signatures are base58 encoded and 88 characters long
  return /^[1-9A-HJ-NP-Za-km-z]{88,98}$/.test(signature);
}

// Function to send subscription request
function sendSubscribeRequest(ws: WebSocket): void {
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

// Process transactions in batches with rate limiting
async function processPendingTransactions() {
  if (processingBatch || pendingTransactions.length === 0) return;

  // Check rate limit before processing batch
  if (!checkRateLimit()) {
    setTimeout(processPendingTransactions, 5000);
    return;
  }

  processingBatch = true;
  const batchSize = Math.min(BATCH_SIZE, pendingTransactions.length);
  console.log(`\n🔄 Processing batch of ${batchSize} transactions...`);

  // Take next batch of transactions
  const batch = pendingTransactions.splice(0, batchSize);

  for (const signature of batch) {
    try {
      if (!checkRateLimit()) {
        // Put transaction back in queue if rate limited
        pendingTransactions.unshift(signature);
        break;
      }
      await processTransaction(signature);
      // Add delay between transactions in batch
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`Error processing transaction ${signature}:`, error);
    }
  }

  processingBatch = false;

  // Schedule next batch with rate limiting
  if (pendingTransactions.length > 0) {
    const nextBatchDelay = Math.max(BATCH_INTERVAL, (60000 - (Date.now() - lastReset)));
    console.log(`📅 Next batch scheduled in ${nextBatchDelay/1000}s`);
    setTimeout(processPendingTransactions, nextBatchDelay);
  }
}

// Function to handle individual transactions
async function processTransaction(signature: string): Promise<void> {
  // Validate signature format first
  if (!isValidSignature(signature)) {
    console.log(`🚫 Invalid signature format: ${signature}`);
    return;
  }

  if (!checkRateLimit()) {
    throw new Error("Rate limit reached during transaction processing");
  }

  console.log("\n=============================================");
  console.log("🔎 New Liquidity Pool found.");
  console.log("🔃 Fetching transaction details ...");

  const data = await fetchTransactionDetails(signature);
  if (!data) {
    console.log("⛔ Transaction aborted. No data returned.");
    console.log("🟢 Resuming looking for new tokens...\n");
    return;
  }

  if (!data.solMint || !data.tokenMint) return;

  const isRugCheckPassed = await getRugCheckConfirmed(data.tokenMint);
  if (!isRugCheckPassed) {
    console.log("🚫 Rug Check not passed! Transaction aborted.");
    console.log("🟢 Resuming looking for new tokens...\n");
    return;
  }

  if (data.tokenMint.trim().toLowerCase().endsWith("pump") && config.rug_check.ignore_pump_fun) {
    console.log("🚫 Transaction skipped. Ignoring Pump.fun.");
    console.log("🟢 Resuming looking for new tokens..\n");
    return;
  }

  console.log("Token found");
  console.log("👽 GMGN: https://gmgn.ai/sol/token/" + data.tokenMint);
  console.log("😈 BullX: https://neo.bullx.io/terminal?chainId=1399811149&address=" + data.tokenMint);

  if (config.rug_check.simulation_mode) {
    console.log("👀 Token not swapped. Simulation mode is enabled.");
    console.log("🟢 Resuming looking for new tokens..\n");
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, config.tx.swap_tx_initial_delay));

  const tx = await createSwapTransaction(data.solMint, data.tokenMint);
  if (!tx) {
    console.log("⛔ Transaction aborted.");
    console.log("🟢 Resuming looking for new tokens...\n");
    return;
  }

  console.log("🚀 Swapping SOL for Token.");
  console.log("Swap Transaction: ", "https://solscan.io/tx/" + tx);

  const saveConfirmation = await fetchAndSaveSwapDetails(tx);
  if (!saveConfirmation) {
    console.log("❌ Warning: Transaction not saved for tracking! Track Manually!");
  }
}

// WebSocket connection manager
function initializeWebSocket(): void {
  const env = validateEnv();
  const ws = new WebSocket(env.HELIUS_WSS_URI, {
    handshakeTimeout: 10000,
    maxPayload: 50 * 1024 * 1024,
  });

  console.log("\n🔓 Attempting WebSocket connection...");

  ws.on("open", () => {
    console.log("✅ WebSocket connected successfully");
    wsRetryCount = 0;
    sendSubscribeRequest(ws);
  });

  ws.on("message", async (data: WebSocket.Data) => {
    try {
      const jsonString = data.toString();
      const parsedData = JSON.parse(jsonString);

      if (parsedData.result !== undefined && !parsedData.error) {
        console.log("✅ Subscription confirmed");
        return;
      }

      if (parsedData.error) {
        console.error("🚫 RPC Error:", parsedData.error);
        return;
      }

      // Extract logs and signature
      const logs = parsedData?.params?.result?.value?.logs;
      const signature = parsedData?.params?.result?.value?.signature;

      // Validate logs and signature
      if (!Array.isArray(logs) || !signature || !isValidSignature(signature)) {
        console.log("⚠️ Invalid WebSocket message format", { 
          hasLogs: Array.isArray(logs), 
          hasSignature: !!signature,
          isValidSig: isValidSignature(signature || '')
        });
        return;
      }

      // Check for new pool creation
      const containsCreate = logs.some((log: string) => 
        typeof log === "string" && log.includes("Program log: initialize2: InitializeInstruction2")
      );

      if (!containsCreate) return;

      // Add new transaction to pending queue with rate limiting
      if (!pendingTransactions.includes(signature)) {
        // Check if we're approaching rate limit
        if (requestCount >= MAX_REQUESTS_PER_MINUTE * 0.9) {
          console.log("⚠️ Approaching rate limit, slowing down...");
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

        pendingTransactions.push(signature);
        console.log(`📝 Added transaction ${signature} to queue (${pendingTransactions.length} pending)`);

        // Start processing if not already processing
        if (!processingBatch) {
          processPendingTransactions();
        }
      }

    } catch (error) {
      console.error("💥 Error processing message:", {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  ws.on("error", (error: Error) => {
    console.error("🚫 WebSocket error:", error.message);
  });

  ws.on("close", (code: number, reason: string) => {
    console.log(`📴 WebSocket closed (${code}): ${reason || 'No reason provided'}`);

    ws.removeAllListeners();

    if (wsRetryCount < MAX_WS_RETRIES) {
      wsRetryCount++;
      console.log(`🔄 Attempting reconnection ${wsRetryCount}/${MAX_WS_RETRIES} in ${WS_RETRY_DELAY/1000}s...`);
      setTimeout(initializeWebSocket, WS_RETRY_DELAY);
    } else {
      console.error("❌ Max reconnection attempts reached. Please restart the application.");
      process.exit(1);
    }
  });
}

// Print initial status
console.log("\n🚀 Starting Solana Token Monitor...");
console.log(`\n⚡ Rate Limits:`);
console.log(`   Max Requests/min: ${MAX_REQUESTS_PER_MINUTE}`);
console.log(`   Batch Size: ${BATCH_SIZE}`);
console.log(`   Batch Interval: ${BATCH_INTERVAL/1000}s`);

console.clear();
initializeWebSocket();