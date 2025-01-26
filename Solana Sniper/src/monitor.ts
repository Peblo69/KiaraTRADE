import { Connection, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
import { config } from "./config";
import { fetchTransactionDetails, getRugCheckConfirmed } from "./transactions";

dotenv.config();

function formatTime() {
  return new Date().toLocaleTimeString();
}

async function monitorTokens() {
  console.log("\n🚀 Starting Solana Token Monitor...");
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

  if (!process.env.HELIUS_API_KEY) {
    console.error("Error: HELIUS_API_KEY not found in environment variables");
    process.exit(1);
  }

  const connection = new Connection(
    `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  );

  // Subscribe to new token launches
  connection.onProgramAccountChange(
    new PublicKey(config.liquidity_pool.radiyum_program_id),
    async (keyedAccountInfo, context) => {
      try {
        const signature = context.slot.toString();
        console.log(`\n🔔 [${formatTime()}] New Token Event Detected!`);
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
        console.error("Error processing token:", error);
      }
    }
  );

  console.log("\n👀 Monitoring for new tokens...");
  console.log("Press Ctrl+C to stop\n");
}

monitorTokens().catch(console.error);
