
import { usePumpPortalStore } from "./pump-portal-websocket";
import { TokenTrade } from "@/types/token";

const HELIUS_API_KEY = "7c087d36-ebf5-4126-8970-d3f71dd5436c";
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

class HeliusTradeIntegration {
  private ws: WebSocket | null = null;

  public connect() {
    this.ws = new WebSocket(HELIUS_WS_URL);
    
    this.ws.onopen = () => {
      console.log("[Helius] Connected for trade data");
      
      // Subscribe to program notifications
      if (this.ws) {
        this.ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "programSubscribe",
          params: {
            programId: "PumpFunzwNQU4wi4zawyeHdtSjkQk4ci6gh8s9T7zK"
          }
        }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("[Helius] Received message:", message);

        if (message.method === "programNotification") {
          const notification = message.params.result;
          if (notification?.value?.account?.data?.parsed) {
            const info = notification.value.account.data.parsed.info;
            
            const trade: TokenTrade = {
              signature: message.params.result.signature || "",
              timestamp: Date.now(),
              mint: info.mint,
              txType: info.txType || "buy",
              tokenAmount: parseFloat(info.amount || "0"),
              solAmount: 0,
              traderPublicKey: info.owner || "",
              counterpartyPublicKey: "",
              bondingCurveKey: info.bondingCurveKey || "",
              vTokensInBondingCurve: parseFloat(info.vTokensInBondingCurve || "0"),
              vSolInBondingCurve: parseFloat(info.vSolInBondingCurve || "0"),
              marketCapSol: parseFloat(info.marketCapSol || "0"),
              priceInSol: parseFloat(info.priceInSol || "0"),
              priceInUsd: parseFloat(info.priceInUsd || "0"),
            };

            console.log("[Helius] Trade event:", trade);
            usePumpPortalStore.getState().addTradeToHistory(trade.mint, trade);
          }
        }
      } catch (err) {
        console.error("[Helius] Error processing message:", err);
      }
    };

    this.ws.onclose = () => {
      console.log("[Helius] Connection closed");
      setTimeout(() => this.connect(), 5000); // Reconnect after 5 seconds
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
