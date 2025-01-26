import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Test to check if we can fetch transaction details
(async () => {
  console.log("Testing Helius API connection...");
  try {
    // Test transaction signature from Solana - this is a real but old transaction
    const testId = "4DTqjzryxLdfajXN9Aq8qMbEEm64SK5Zeua3Ame1Y3pzdigpJeEJEQjye4tD7KeS8fCkSgF1oomuNfpztEAJkAaV";
    const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

    const response = await axios.post(heliusUrl, {
      jsonrpc: "2.0",
      id: "my-id",
      method: "getTransaction",
      params: [
        testId,
        { maxSupportedTransactionVersion: 0 }
      ]
    });

    console.log("Successfully connected to Helius API!");
    console.log("Transaction details:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error connecting to Helius:", error.message);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Response data:", error.response.data);
    }
  }
})();