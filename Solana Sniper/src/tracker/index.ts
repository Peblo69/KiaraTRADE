import { config } from "./../config"; // Configuration parameters for our bot
import axios from "axios";
import dotenv from "dotenv";
import { createSellTransaction, createSellTransactionResponse } from "../transactions";
import { DateTime } from "luxon";
import type { LastPriceDexReponse } from "../types";

// Load environment variables from the .env file
dotenv.config();

// In-memory tracking
interface TokenTrack {
  mint: string;
  buyPrice: number;
  amount: number;
  buyTime: number;
}

const trackedTokens: TokenTrack[] = [];

async function main() {
  const priceUrl = process.env.JUP_HTTPS_PRICE_URI || "";
  const dexPriceUrl = process.env.DEX_HTTPS_LATEST_TOKENS || "";
  const priceSource = config.sell.price_source || "jup";
  const solMint = config.liquidity_pool.wsol_pc_mint;

  // Create const for holdings and action logs.
  const holdingLogs: string[] = [];
  const actionLogs: string[] = [];
  let currentPriceSource = "Jupiter Aggregator";

  // Create regional functions to push holdings and logs to const
  const saveLogTo = (logsArray: string[], ...args: unknown[]): void => {
    const message = args.map((arg) => String(arg)).join(" ");
    logsArray.push(message);
  };

  // If we have tracked tokens
  if (trackedTokens.length !== 0) {
    // Get all token ids
    const tokenValues = trackedTokens.map((token) => token.mint).join(",");

    try {
      // Jupiter Aggregator Price
      const priceResponse = await axios.get<any>(priceUrl, {
        params: {
          ids: tokenValues + "," + solMint,
          showExtraInfo: true,
        },
        timeout: config.tx.get_timeout,
      });
      const currentPrices = priceResponse.data.data;
      if (!currentPrices) {
        saveLogTo(actionLogs, `⛔ Latest prices from Jupiter Aggregator could not be fetched. Trying again...`);
        return;
      }

      // Loop through tracked tokens
      for (const token of trackedTokens) {
        const tokenCurrentPrice = currentPrices[token.mint]?.extraInfo?.lastSwappedPrice?.lastJupiterSellPrice;
        if (!tokenCurrentPrice) continue;

        // Calculate PnL
        const unrealizedPnLPercent = ((tokenCurrentPrice - token.buyPrice) / token.buyPrice) * 100;
        const iconPnl = unrealizedPnLPercent > 0 ? "🟢" : "🔴";

        // Format time
        const hrTradeTime = DateTime.fromMillis(token.buyTime).toFormat("HH:mm:ss");

        // Check SL/TP
        if (config.sell.auto_sell) {
          const amountIn = token.amount.toString().replace(".", "");

          // Sell via Take Profit
          if (unrealizedPnLPercent >= config.sell.take_profit_percent) {
            try {
              const result: createSellTransactionResponse = await createSellTransaction(solMint, token.mint, amountIn);
              if (result.success) {
                saveLogTo(actionLogs, `✅🟢 ${hrTradeTime}: Took profit for ${token.mint}\nTx: ${result.tx}`);
                // Remove from tracking after successful sell
                const index = trackedTokens.indexOf(token);
                if (index > -1) trackedTokens.splice(index, 1);
              } else {
                saveLogTo(actionLogs, `⚠️ ERROR when taking profit for ${token.mint}: ${result.msg}`);
              }
            } catch (error: any) {
              saveLogTo(actionLogs, `⚠️ ERROR when taking profit for ${token.mint}: ${error.message}`);
            }
          }

          // Sell via Stop Loss
          if (unrealizedPnLPercent <= -config.sell.stop_loss_percent) {
            try {
              const result: createSellTransactionResponse = await createSellTransaction(solMint, token.mint, amountIn);
              if (result.success) {
                saveLogTo(actionLogs, `✅🔴 ${hrTradeTime}: Triggered Stop Loss for ${token.mint}\nTx: ${result.tx}`);
                // Remove from tracking after successful sell
                const index = trackedTokens.indexOf(token);
                if (index > -1) trackedTokens.splice(index, 1);
              } else {
                saveLogTo(actionLogs, `⚠️ ERROR when triggering Stop Loss for ${token.mint}: ${result.msg}`);
              }
            } catch (error: any) {
              saveLogTo(actionLogs, `⚠️ ERROR when triggering Stop Loss for ${token.mint}: ${error.message}`);
            }
          }
        }

        // Log current holdings
        saveLogTo(
          holdingLogs,
          `${hrTradeTime}: ${iconPnl} PnL: ${unrealizedPnLPercent.toFixed(2)}% | ${token.amount} tokens @ ${token.mint}`
        );
      }
    } catch (error: any) {
      console.error("Error fetching prices:", error.message);
    }
  }

  // Output Current Holdings
  console.clear();
  console.log(`📈 Current Holdings via ✅ ${currentPriceSource}`);
  console.log("================================================================================");
  if (trackedTokens.length === 0) console.log("No token holdings yet as of", new Date().toISOString());
  console.log(holdingLogs.join("\n"));

  // Output Action Logs
  console.log("\n\n📜 Action Logs");
  console.log("================================================================================");
  console.log("Last Update: ", new Date().toISOString());
  console.log(actionLogs.join("\n"));

  // Output wallet tracking if set in config
  if (config.sell.track_public_wallet) {
    console.log("\nCheck your wallet: https://gmgn.ai/sol/address/" + config.sell.track_public_wallet);
  }

  setTimeout(main, 5000); // Call main again after 5 seconds
}

main().catch((err) => {
  console.error(err);
});

// Export for use in other files
export function addTokenToTracking(mint: string, amount: number, buyPrice: number) {
  trackedTokens.push({
    mint,
    amount,
    buyPrice,
    buyTime: Date.now()
  });
}