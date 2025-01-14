import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { generateAIResponse, type ChatMessage } from "./services/ai";
import { cryptoService } from "./services/crypto";
import { subscriptionService } from "./services/subscription";
import { requireSubscription } from "./middleware/subscription";

// Authentication type
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
  const connectedClients = new Set();

  // WebSocket setup with error handling
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws",
    handleProtocols: (protocols, _request) => {
      const protocolArray = Array.from(protocols || []);
      return protocolArray.includes('vite-hmr') ? false : (protocolArray[0] || false);
    }
  });

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

    startPriceUpdates();

    ws.on("error", (error) => {
      console.error("WebSocket client error:", error);
      stopPriceUpdates();
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      stopPriceUpdates();
    });

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

  // API Routes
  app.get("/api/market/overview", async (_req, res) => {
    try {
      const marketData = await cryptoService.getMarketOverview();
      res.json(marketData);
    } catch (error: any) {
      console.error("Error fetching market overview:", error);
      res.status(500).json({ 
        error: "Failed to fetch market overview",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.get("/api/subscription/plans", async (_req, res) => {
    try {
      const plans = await subscriptionService.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ 
        error: "Failed to fetch subscription plans",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Require authentication for these routes
  app.use("/api/subscription", (req: AuthenticatedRequest, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        details: "Please login to access subscription features"
      });
    }
    next();
  });

  app.post("/api/subscription/verify", async (req: AuthenticatedRequest, res) => {
    try {
      const { signature, planId, amount } = req.body;

      if (!signature || !planId || amount === undefined) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "Transaction signature, plan ID, and amount are required"
        });
      }

      const isValid = await subscriptionService.verifyTransaction(signature);
      if (!isValid) {
        return res.status(400).json({
          error: "Invalid transaction",
          details: "The transaction could not be verified"
        });
      }

      const subscription = await subscriptionService.createSubscription({
        userId: req.user!.id,
        planId,
        transactionSignature: signature,
        amountSol: amount
      });

      res.json({ subscription });
    } catch (error: any) {
      console.error("Subscription verification error:", error);
      res.status(500).json({ 
        error: "Failed to verify subscription",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.post("/api/subscription/cancel", async (req: AuthenticatedRequest, res) => {
    try {
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({
          error: "Missing subscription ID",
          details: "Subscription ID is required"
        });
      }

      await subscriptionService.cancelSubscription(subscriptionId, req.user!.id);
      res.json({ message: "Subscription cancelled successfully" });
    } catch (error: any) {
      console.error("Subscription cancellation error:", error);
      res.status(500).json({ 
        error: "Failed to cancel subscription",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Protected routes with subscription tiers
  app.get("/api/premium/market-analysis", 
    requireSubscription("pro"),
    (_req, res) => {
      res.json({ 
        message: "Premium market analysis data",
        data: {
          // Premium content here
        }
      });
    }
  );

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
    } catch (error: any) {
      console.error("Chat error:", {
        message: error.message,
        type: error.constructor.name,
        status: error.status || 500,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      const statusCode = error.status || 500;
      res.status(statusCode).json({ 
        error: error.message || "Failed to process chat message",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    } catch (error: any) {
      console.error("Health check error:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  return httpServer;
}