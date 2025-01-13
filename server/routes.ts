import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";

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

  // WebSocket server for real-time crypto data
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws",
    handleProtocols: (protocols, _request) => {
      // Convert Set to Array for proper protocol handling
      const protocolArray = Array.from(protocols);
      if (protocolArray.includes('vite-hmr')) {
        return false;
      }
      return protocolArray.length > 0 ? protocolArray[0] : false;
    }
  });

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");

    // Send initial data for all coins
    Object.entries(prices).forEach(([symbol, price]) => {
      const data: CryptoData = {
        symbol,
        price: price.toFixed(2),
        change24h: ((Math.random() * 10) - 5).toFixed(2) // Random initial 24h change
      };
      ws.send(JSON.stringify(data));
    });

    // Simulate price updates
    const interval = setInterval(() => {
      Object.entries(prices).forEach(([symbol, currentPrice]) => {
        prices[symbol] = generatePrice(currentPrice);
        const data: CryptoData = {
          symbol,
          price: prices[symbol].toFixed(2),
          change24h: ((Math.random() * 10) - 5).toFixed(2)
        };
        ws.send(JSON.stringify(data));
      });
    }, 2000);

    ws.on("close", () => {
      console.log("Client disconnected");
      clearInterval(interval);
    });
  });

  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}