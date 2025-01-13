import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { generateAIResponse, type ChatMessage } from "./services/ai";

interface CryptoData {
  symbol: string;
  price: string;
  change24h: string;
}

type CryptoPrices = {
  [key: string]: number;
};

const INITIAL_PRICES: CryptoPrices = {
  bitcoin: 45000,
  ethereum: 2500,
  solana: 100,
  cardano: 0.5,
  polkadot: 15,
  "avalanche-2": 35,
  chainlink: 20,
  polygon: 0.8,
  uniswap: 7,
  cosmos: 8,
  near: 3,
  algorand: 0.25,
  ripple: 0.5,
  dogecoin: 0.1
};

function generatePrice(current: number): number {
  const changePercent = (Math.random() - 0.5) * 0.002; // 0.2% max change
  return current * (1 + changePercent);
}

function generateChange24h(): string {
  return ((Math.random() * 10) - 5).toFixed(2); // -5% to +5% change
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const prices: CryptoPrices = { ...INITIAL_PRICES };
  const connectedClients = new Set();

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
    console.log("New WebSocket connection established");
    connectedClients.add(ws);

    const sendPriceUpdates = () => {
      if (ws.readyState === ws.OPEN) {
        Object.entries(prices).forEach(([symbol, currentPrice]) => {
          // Update price
          prices[symbol] = generatePrice(currentPrice);

          try {
            const data: CryptoData = {
              symbol,
              price: prices[symbol].toFixed(2),
              change24h: generateChange24h()
            };
            ws.send(JSON.stringify(data));
          } catch (error) {
            console.error(`Error sending price update for ${symbol}:`, error);
          }
        });
      }
    };

    // Send initial prices immediately
    sendPriceUpdates();

    // Set up interval for price updates - every 2 seconds
    const interval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        sendPriceUpdates();
      } else {
        clearInterval(interval);
        connectedClients.delete(ws);
      }
    }, 2000);

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clearInterval(interval);
      connectedClients.delete(ws);
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      clearInterval(interval);
      connectedClients.delete(ws);
    });

    // Ping/Pong to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  });

  // Add AI chat endpoint with conversation history
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ 
          error: "Message is required",
          details: "Please provide a message to process"
        });
      }

      console.log("Processing chat message:", message);
      console.log("Chat history length:", history?.length || 0);

      const response = await generateAIResponse(message, history);
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
      websocket_clients: connectedClients.size,
      active_symbols: Object.keys(prices).length
    });
  });

  return httpServer;
}