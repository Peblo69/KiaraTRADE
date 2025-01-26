import WebSocket from "ws";
import { WebSocketRequest } from "./types";
import { config } from "./config";
import { fetchTransactionDetails, createSwapTransaction, getRugCheckConfirmed, fetchAndSaveSwapDetails } from "./transactions";
import { validateEnv } from "./utils/env-validator";

// Regional Variables
let activeTransactions = 0;
const MAX_CONCURRENT = config.tx.concurrent_transactions;

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
        commitment: "processed",
      },
    ],
  };
  ws.send(JSON.stringify(request));
}

// Function used to handle the transaction once a new pool creation is found
async function processTransaction(signature: string): Promise<void> {
  // Output logs
  console.log("=============================================");
  console.log("🔎 New Liquidity Pool found.");
  console.log("🔃 Fetching transaction details ...");

  // Fetch the transaction details
  const data = await fetchTransactionDetails(signature);
  if (!data) {
    console.log("⛔ Transaction aborted. No data returned.");
    console.log("🟢 Resuming looking for new tokens...\n");
    return;
  }

  // Ensure required data is available
  if (!data.solMint || !data.tokenMint) return;

  // Check rug check
  const isRugCheckPassed = await getRugCheckConfirmed(data.tokenMint);
  if (!isRugCheckPassed) {
    console.log("🚫 Rug Check not passed! Transaction aborted.");
    console.log("🟢 Resuming looking for new tokens...\n");
    return;
  }

  // Handle ignored tokens
  if (data.tokenMint.trim().toLowerCase().endsWith("pump") && config.rug_check.ignore_pump_fun) {
    // Check if ignored
    console.log("🚫 Transaction skipped. Ignoring Pump.fun.");
    console.log("🟢 Resuming looking for new tokens..\n");
    return;
  }

  // Ouput logs
  console.log("Token found");
  console.log("👽 GMGN: https://gmgn.ai/sol/token/" + data.tokenMint);
  console.log("😈 BullX: https://neo.bullx.io/terminal?chainId=1399811149&address=" + data.tokenMint);

  // Check if simulation mode is enabled
  if (config.rug_check.simulation_mode) {
    console.log("👀 Token not swapped. Simulation mode is enabled.");
    console.log("🟢 Resuming looking for new tokens...\n");
    return;
  }

  // Add initial delay before first buy
  await new Promise((resolve) => setTimeout(resolve, config.tx.swap_tx_initial_delay));

  // Create Swap transaction
  const tx = await createSwapTransaction(data.solMint, data.tokenMint);
  if (!tx) {
    console.log("⛔ Transaction aborted.");
    console.log("🟢 Resuming looking for new tokens...\n");
    return;
  }

  // Output logs
  console.log("🚀 Swapping SOL for Token.");
  console.log("Swap Transaction: ", "https://solscan.io/tx/" + tx);

  // Fetch and store the transaction for tracking purposes
  const saveConfirmation = await fetchAndSaveSwapDetails(tx);
  if (!saveConfirmation) {
    console.log("❌ Warning: Transaction not saved for tracking! Track Manually!");
  }
}

async function websocketHandler(): Promise<void> {
  try {
    // Load and validate environment variables
    console.log("Loading environment variables...");
    const env = validateEnv();

    // Log the URL (without API key) for debugging
    const sanitizedUrl = env.HELIUS_WSS_URI.replace(/api-key=([^&]*)/, 'api-key=****');
    console.log("Connecting to WebSocket URL:", sanitizedUrl);

    // Create WebSocket connection with explicit error handling
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(env.HELIUS_WSS_URI);
    } catch (error) {
      console.error("WebSocket initialization error:", error);
      throw error;
    }

    if (!ws) {
      throw new Error("Failed to create WebSocket connection");
    }

    ws.on("open", () => {
      console.log("\n🔓 WebSocket connection opened successfully");
      if (ws) sendSubscribeRequest(ws);
    });

    ws.on("message", async (data: WebSocket.Data) => {
      try {
        const jsonString = data.toString();
        const parsedData = JSON.parse(jsonString);

        // Handle subscription response
        if (parsedData.result !== undefined && !parsedData.error) {
          console.log("✅ Subscription confirmed");
          return;
        }

        // Only log RPC errors for debugging
        if (parsedData.error) {
          console.error("🚫 RPC Error:", parsedData.error);
          return;
        }

        // Safely access the nested structure
        const logs = parsedData?.params?.result?.value?.logs;
        const signature = parsedData?.params?.result?.value?.signature;

        // Validate `logs` is an array and if we have a signtature
        if (!Array.isArray(logs) || !signature) return;

        // Verify if this is a new pool creation
        const containsCreate = logs.some((log: string) => typeof log === "string" && log.includes("Program log: initialize2: InitializeInstruction2"));
        if (!containsCreate || typeof signature !== "string") return;

        // Verify if we have reached the max concurrent transactions
        if (activeTransactions >= MAX_CONCURRENT) {
          console.log("⏳ Max concurrent transactions reached, skipping...");
          return;
        }

        // Add additional concurrent transaction
        activeTransactions++;

        // Process transaction asynchronously
        processTransaction(signature)
          .catch((error) => {
            console.error("Error processing transaction:", error);
          })
          .finally(() => {
            activeTransactions--;
          });
      } catch (error) {
        console.error("💥 Error processing message:", {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }
    });

    ws.on("error", (err: Error) => {
      console.error("WebSocket error:", err);
    });

    ws.on("close", () => {
      console.log("📴 WebSocket connection closed, cleaning up...");
      if (ws) {
        ws.removeAllListeners();
        ws = null;
      }
      console.log("🔄 Attempting to reconnect in 5 seconds...");
      setTimeout(websocketHandler, 5000);
    });

  } catch (error) {
    console.error("websocketHandler error:", error);
    throw error;
  }
}

// Start Socket Handler with error logging
console.log("Starting WebSocket handler...");
websocketHandler().catch((err) => {
  console.error("Fatal error in websocketHandler:", err);
  process.exit(1);
});