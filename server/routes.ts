import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { generateAIResponse, type ChatMessage } from "./services/ai";
import { cryptoService } from "./services/crypto";

interface CryptoData {
  symbol: string;
  price: string;
  change24h: string;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const connectedClients = new Set();

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

    const sendPriceUpdates = async (symbols: string[]) => {
      if (ws.readyState === ws.OPEN) {
        try {
          for (const symbol of symbols) {
            const priceData = await cryptoService.getPriceData(symbol);
            const data: CryptoData = {
              symbol,
              price: priceData.price.toFixed(2),
              change24h: priceData.change24h.toFixed(2)
            };
            ws.send(JSON.stringify(data));
          }
        } catch (error) {
          console.error(`Error sending price updates:`, error);
          // Don't close the connection on error, let the client retry
        }
      }
    };

    // Set up interval for price updates
    const interval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        const activeSymbols = cryptoService.getActiveSymbols();
        if (activeSymbols.length > 0) {
          sendPriceUpdates(activeSymbols).catch(error => {
            console.error("Error in price update interval:", error);
          });
        }
      } else {
        clearInterval(interval);
        connectedClients.delete(ws);
      }
    }, 10000); // Update every 10 seconds

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

    // Keep-alive ping
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

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    const cacheStatus = cryptoService.getCacheStatus();
    res.json({ 
      status: "ok",
      openai_configured: !!process.env.OPENAI_API_KEY,
      websocket_clients: connectedClients.size,
      crypto_service: cacheStatus
    });
  });

  return httpServer;
}