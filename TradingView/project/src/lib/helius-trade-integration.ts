// client/src/lib/helius-trade-integration.ts
import { usePumpPortalStore, TokenTrade } from "./pump-portal-websocket";

const HELIUS_WS_URL = "wss://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE"; // Replace with your Helius API key

class HeliusTradeIntegration {
  private ws: WebSocket | null = null;

  public connect() {
    this.ws = new WebSocket(HELIUS_WS_URL);
    this.ws.onopen = () => {
      console.log("[Helius] Connected for trade data");
      // If Helius requires a subscription message, send it here:
      // Example (uncomment and adjust if needed):
      // this.ws.send(JSON.stringify({ method: "subscribe", params: { filter: { ... } } }));
    };
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        // Check if the message is a trade event.
        // (This sample assumes Helius sends a "programNotification" with trade details.)
        if (message.method === "programNotification") {
          const notification = message.params.result;
          if (
            notification &&
            notification.value &&
            notification.value.account &&
            notification.value.account.data &&
            notification.value.account.data.parsed
          ) {
            const info = notification.value.account.data.parsed.info;
            // Build a TokenTrade object from Helius data.
            // (Adjust the mapping as necessary to match Helius's data structure.)
            const trade: TokenTrade = {
              signature: message.params.result.signature || "",
              timestamp: Date.now(),
              mint: info.mint,
              txType: info.txType || "buy", // adjust mapping as needed
              tokenAmount: parseFloat(info.amount || "0"),
              solAmount: 0, // You may calculate this if possible
              traderPublicKey: info.owner || "",
              counterpartyPublicKey: "", // Set if available
              bondingCurveKey: info.bondingCurveKey || "",
              vTokensInBondingCurve: parseFloat(info.vTokensInBondingCurve || "0"),
              vSolInBondingCurve: parseFloat(info.vSolInBondingCurve || "0"),
              marketCapSol: parseFloat(info.marketCapSol || "0"),
              priceInSol: parseFloat(info.priceInSol || "0"),
              priceInUsd: parseFloat(info.priceInUsd || "0"),
            };
            console.log("[Helius] Trade event received:", trade);
            // Update the store with the new trade event.
            usePumpPortalStore.getState().addTradeToHistory(trade.mint, trade);
            // Optionally, update the token price:
            // usePumpPortalStore.getState().updateTokenPrice(trade.mint, trade.priceInUsd);
          }
        }
      } catch (err) {
        console.error("[Helius] Error parsing trade event:", err);
      }
    };
    this.ws.onclose = () => {
      console.log("[Helius] Connection closed");
      // Optionally, add reconnection logic here.
    };
    this.ws.onerror = (err) => {
      console.error("[Helius] WebSocket error:", err);
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const heliusTradeIntegration = new HeliusTradeIntegration();
