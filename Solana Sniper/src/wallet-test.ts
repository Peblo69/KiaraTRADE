import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testWalletConnection() {
  try {
    // Create keypair from private key
    const privateKey = process.env.PRIV_KEY_WALLET;
    if (!privateKey) {
      throw new Error("No private key found in environment variables!");
    }

    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    console.log("Wallet Public Key:", keypair.publicKey.toString());

    // Connect to Solana
    const connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    );

    // Get wallet balance
    const balance = await connection.getBalance(keypair.publicKey);
    console.log("Wallet Balance:", balance / LAMPORTS_PER_SOL, "SOL");

    console.log("✅ Successfully connected to wallet and Solana network!");
    return true;
  } catch (error) {
    console.error("Error testing wallet connection:", error);
    return false;
  }
}

// Run the test
testWalletConnection();
