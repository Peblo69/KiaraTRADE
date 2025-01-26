import { Connection, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
import { config } from "./config";
import { fetchTransactionDetails, getRugCheckConfirmed } from "./transactions";

dotenv.config();

async function monitorTokens() {
  console.log("🚀 Starting Solana Token Monitor...");
  console.log("✅ Safety Settings:");
  console.log(`   Max Trade Amount: ${parseInt(config.swap.amount)/1e9} SOL`);
  console.log(`   Stop Loss: ${config.sell.stop_loss_percent}%`);
  console.log(`   Take Profit: ${config.sell.take_profit_percent}%`);
  
  const connection = new Connection(
    `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  );

  // Subscribe to new token launches
  connection.onProgramAccountChange(
    new PublicKey(config.liquidity_pool.radiyum_program_id),
    async (keyedAccountInfo, context) => {
      try {
        const signature = context.slot.toString();
        console.log("\n🔔 New Token Event Detected!");
        console.log("   Analyzing transaction...");

        const mints = await fetchTransactionDetails(signature);
        if (!mints || !mints.tokenMint) {
          console.log("❌ Invalid transaction data");
          return;
        }

        console.log(`\n📊 Token Analysis:`);
        console.log(`   Address: ${mints.tokenMint}`);

        // Run rug check
        console.log("\n🔍 Running Safety Checks...");
        const isRugSafe = await getRugCheckConfirmed(mints.tokenMint);
        
        if (isRugSafe) {
          console.log("✅ Token passed all safety checks!");
          // In test mode, just show what would happen
          console.log("\n🔄 Test Mode Actions:");
          console.log(`   Would buy for: ${parseInt(config.swap.amount)/1e9} SOL`);
          console.log(`   Stop Loss: ${config.sell.stop_loss_percent}%`);
          console.log(`   Take Profit: ${config.sell.take_profit_percent}%`);
        } else {
          console.log("❌ Token failed safety checks");
        }
        
        console.log("\n-----------------------------------");
      } catch (error) {
        console.error("Error processing token:", error);
      }
    }
  );

  console.log("\n👀 Monitoring for new tokens...");
  console.log("Press Ctrl+C to stop\n");
}

monitorTokens().catch(console.error);
