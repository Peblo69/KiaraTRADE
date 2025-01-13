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

  // Add AI chat endpoint with better error handling and logging
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ 
          error: "Message is required",
          details: "Please provide a message to process"
        });
      }

      console.log("Processing chat message:", message);
      console.log("API Key configured:", !!process.env.OPENAI_API_KEY);

      const response = await generateAIResponse(message);
      console.log("Generated response:", response.slice(0, 50) + "...");

      res.json({ response });
    } catch (error: any) {
      console.error("Chat error:", {
        message: error.message,
        type: error.constructor.name,
        status: error.status || 500,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      const statusCode = error.status || 500;
      const errorMessage = error.message || "Failed to process chat message";

      res.status(statusCode).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Enhanced health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok",
      openai_configured: !!process.env.OPENAI_API_KEY,
      openai_key_length: process.env.OPENAI_API_KEY?.length || 0
    });
  });

  return httpServer;
}