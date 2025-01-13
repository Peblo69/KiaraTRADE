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

  // Create WebSocket server with proper error handling
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws",
    handleProtocols: (protocols, _request) => {
      const protocolArray = Array.from(protocols || []);
      return protocolArray.includes('vite-hmr') ? false : (protocolArray[0] || false);
    }
  });

  // Error handler for the WebSocket server
  wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
  });

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection established");
    connectedClients.add(ws);

    const sendPriceUpdates = async (symbols: string[]) => {
      if (ws.readyState !== ws.OPEN) return;

      try {
        for (const symbol of symbols) {
          try {
            const priceData = await cryptoService.getPriceData(symbol);
            const data: CryptoData = {
              symbol,
              price: priceData.price.toFixed(2),
              change24h: priceData.change24h.toFixed(2)
            };

            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify(data));
            }
          } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
            // Continue with other symbols even if one fails
          }
        }
      } catch (error) {
        console.error(`Error in price update batch:`, error);
      }
    };

    let priceUpdateInterval: NodeJS.Timeout | null = null;

    const startPriceUpdates = () => {
      if (priceUpdateInterval) return;

      priceUpdateInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          const activeSymbols = cryptoService.getActiveSymbols();
          if (activeSymbols.length > 0) {
            sendPriceUpdates(activeSymbols).catch(error => {
              console.error("Error in price update interval:", error);
            });
          }
        } else {
          stopPriceUpdates();
        }
      }, 10000); // Update every 10 seconds
    };

    const stopPriceUpdates = () => {
      if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
        priceUpdateInterval = null;
      }
      connectedClients.delete(ws);
    };

    // Start price updates
    startPriceUpdates();

    // Handle WebSocket events
    ws.on("error", (error) => {
      console.error("WebSocket client error:", error);
      stopPriceUpdates();
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      stopPriceUpdates();
    });

    // Keep-alive ping with error handling
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.ping();
        } catch (error) {
          console.error("Error sending ping:", error);
          clearInterval(pingInterval);
          stopPriceUpdates();
        }
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  });

  // Add AI chat endpoint with improved error handling
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

  // Health check endpoint with detailed status
  app.get("/api/health", (_req, res) => {
    try {
      const cacheStatus = cryptoService.getCacheStatus();
      res.json({ 
        status: "ok",
        openai_configured: !!process.env.OPENAI_API_KEY,
        websocket_clients: connectedClients.size,
        crypto_service: cacheStatus
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ status: "error", message: "Failed to get system status" });
    }
  });

  return httpServer;
}