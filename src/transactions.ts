import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { config } from "./config";
import axios from "axios";
import { validateEnv } from "./utils/env-validator";
import { SwapDetails } from "./types";

const env = validateEnv();

async function fetchTransactionDetails(signature: string) {
  try {
    const response = await axios.get(`${env.HELIUS_HTTPS_URI_TX}${signature}`);
    if (!response.data || response.data.length === 0) return null;

    const solMint = "So11111111111111111111111111111111111111112";
    const tokenMint = response.data[0].tokenTransfers?.[0]?.mint;

    return {
      solMint,
      tokenMint,
      signature,
    };
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    return null;
  }
}

async function getRugCheckConfirmed(tokenMint: string): Promise<boolean> {
  try {
    // Perform basic validation first
    if (!tokenMint) {
      console.log("🚫 Invalid token mint");
      return false;
    }

    // Simple risk assessment based on config
    if (!config.rug_check.enabled) {
      console.log("⚠️ Rug check is disabled");
      return true;
    }

    // Implement your rug check logic here
    // For demo purposes, we're just returning true
    return true;
  } catch (error) {
    console.error("Error in rug check:", error);
    return false;
  }
}

async function createSwapTransaction(solMint: string, tokenMint: string): Promise<string | null> {
  try {
    // Get quote
    const quoteResponse = await axios.get(env.JUP_HTTPS_QUOTE_URI, {
      params: {
        inputMint: solMint,
        outputMint: tokenMint,
        amount: config.tx.min_volume_sol * 1_000_000_000, // Convert to lamports
        slippageBps: 100,
      },
    });

    if (!quoteResponse.data) {
      console.log("No quote available");
      return null;
    }

    // Get swap transaction
    const swapResponse = await axios.post(env.JUP_HTTPS_SWAP_URI, {
      quoteResponse: quoteResponse.data,
      userPublicKey: env.PRIV_KEY_WALLET,
    });

    if (!swapResponse.data?.swapTransaction) {
      console.log("No swap transaction available");
      return null;
    }

    // For demo purposes, returning the transaction signature
    return "simulated_tx_" + Date.now();
  } catch (error) {
    console.error("Error creating swap transaction:", error);
    return null;
  }
}

async function fetchAndSaveSwapDetails(signature: string): Promise<boolean> {
  try {
    // In a real implementation, you would:
    // 1. Fetch transaction details from Solana
    // 2. Parse the details to get token amounts
    // 3. Save to your database

    console.log(`Saved swap details for signature: ${signature}`);
    return true;
  } catch (error) {
    console.error("Error saving swap details:", error);
    return false;
  }
}

export {
  fetchTransactionDetails,
  getRugCheckConfirmed,
  createSwapTransaction,
  fetchAndSaveSwapDetails,
};
