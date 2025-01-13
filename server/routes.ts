import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { generateAIResponse } from "./services/ai";

interface CryptoData {
  symbol: string;
  price: string;
  change24h: string;
}

type CryptoPrices = {
  [key: string]: number;
};

const INITIAL_PRICES: CryptoPrices = {
  BTC: 45000,
  ETH: 2500,
  SOL: 100
};

function generatePrice(current: number): number {
  const changePercent = (Math.random() - 0.5) * 0.002; // 0.2% max change
  return current * (1 + changePercent);
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const prices: CryptoPrices = { ...INITIAL_PRICES };

  // WebSocket server setup with better error handling
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws",
    handleProtocols: (protocols, _request) => {
      const protocolArray = Array.from(protocols || []);
      return protocolArray.includes('vite-hmr') ? false : (protocolArray[0] || false);
    }
  });

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    let interval: NodeJS.Timeout;

    const sendPriceUpdates = () => {
      if (ws.readyState === ws.OPEN) {
        Object.entries(prices).forEach(([symbol, currentPrice]) => {
          prices[symbol] = generatePrice(currentPrice);
          const data: CryptoData = {
            symbol,
            price: prices[symbol].toFixed(2),
            change24h: ((Math.random() * 10) - 5).toFixed(2)
          };
          ws.send(JSON.stringify(data));
        });
      }
    };

    // Send initial prices
    sendPriceUpdates();

    // Start price updates
    interval = setInterval(sendPriceUpdates, 2000);

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clearInterval(interval);
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      clearInterval(interval);
    });
  });

  // Add AI chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await generateAIResponse(message);
      res.json({ response });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Basic health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}