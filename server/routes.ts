import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { generateAIResponse } from "./services/ai";
import { cryptoService } from "./services/crypto";
import { subscriptionService } from "./services/subscription";
import { requireSubscription } from "./middleware/subscription";
import { log } from "./vite";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    subscription_tier: string;
  };
}

interface CryptoData {
  symbol: string;
  price: string;
  change24h: string;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const connectedClients = new Set<WebSocket>();

  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws",
    handleProtocols: (protocols, _request) => {
      const protocolArray = Array.isArray(protocols) ? protocols : Array.from(protocols || []);
      return protocolArray.includes('vite-hmr') ? false : (protocolArray[0] || false);
    }
  });

  wss.on('error', (error: Error) => {
    log(`WebSocket Server Error: ${error.message}`);
  });

  wss.on("connection", (ws: WebSocket) => {
    try {
      log("New WebSocket connection established");
      connectedClients.add(ws);

      const sendPriceUpdates = async (symbols: string[]) => {
        if (ws.readyState !== ws.OPEN) {
          log("WebSocket not open, skipping price update");
          return;
        }

        try {
          for (const symbol of symbols) {
            const priceData = await cryptoService.getPriceData(symbol);
            if (!priceData) continue;

            const data: CryptoData = {
              symbol,
              price: priceData.price.toFixed(2),
              change24h: priceData.change24h.toFixed(2)
            };

            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify(data));
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          log(`Error in price update batch: ${errorMessage}`);
        }
      };

      let priceUpdateInterval: NodeJS.Timeout | null = null;

      const startPriceUpdates = () => {
        if (priceUpdateInterval) {
          log("Price updates already running");
          return;
        }

        priceUpdateInterval = setInterval(() => {
          if (ws.readyState === ws.OPEN) {
            const activeSymbols = cryptoService.getActiveSymbols();
            if (activeSymbols.length > 0) {
              sendPriceUpdates(activeSymbols).catch(error => {
                const errorMessage = error instanceof Error ? error.message : String(error);
                log(`Error in price update interval: ${errorMessage}`);
              });
            }
          } else {
            stopPriceUpdates();
          }
        }, 10000);
      };

      const stopPriceUpdates = () => {
        if (priceUpdateInterval) {
          clearInterval(priceUpdateInterval);
          priceUpdateInterval = null;
        }
        connectedClients.delete(ws);
        log("Stopped price updates and removed client");
      };

      startPriceUpdates();

      ws.on("error", (error: Error) => {
        log(`WebSocket client error: ${error.message}`);
        stopPriceUpdates();
      });

      ws.on("close", () => {
        log("Client disconnected");
        stopPriceUpdates();
      });

      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.ping((error?: Error) => {
            if (error) {
              log(`Ping error: ${error.message}`);
              clearInterval(pingInterval);
              stopPriceUpdates();
            }
          });
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.on("pong", () => {
        log("Received pong from client");
      });
    } catch (wsError) {
      const errorMessage = wsError instanceof Error ? wsError.message : String(wsError);
      log(`WebSocket connection handling error: ${errorMessage}`);
    }
  });

  // API Routes
  app.get("/api/market/overview", async (_req, res) => {
    try {
      const marketData = await cryptoService.getMarketOverview();
      res.json(marketData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error fetching market overview: ${errorMessage}`);
      res.status(500).json({ 
        error: "Failed to fetch market overview",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  app.get("/api/subscription/plans", async (_req, res) => {
    try {
      const plans = await subscriptionService.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error fetching subscription plans: ${errorMessage}`);
      res.status(500).json({ 
        error: "Failed to fetch subscription plans",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
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

      const response = await generateAIResponse(message, history);
      res.json({ response });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        message: errorMessage,
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        status: (error as any)?.status || 500
      };
      log(`Chat error: ${JSON.stringify(errorDetails)}`);

      res.status(errorDetails.status).json({ 
        error: errorMessage || "Failed to process chat message",
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  });

  // Health check endpoint
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Health check error: ${errorMessage}`);
      res.status(500).json({ status: "error", message: errorMessage });
    }
  });

  return httpServer;
}