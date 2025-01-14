import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
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

  // WebSocket setup with proper HMR handling
  const wss = new WebSocketServer({ 
    noServer: true,
    path: "/ws"
  });

  // Handle WebSocket upgrade with improved vite-hmr handling
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url || '';
    if (pathname === '/ws') {
      // Skip Vite HMR connections
      const protocol = request.headers['sec-websocket-protocol'];
      if (protocol === 'vite-hmr') {
        log('Skipping vite-hmr WebSocket connection');
        socket.destroy();
        return;
      }

      log(`Processing WebSocket upgrade request for: ${pathname}`);
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    try {
      log("New WebSocket connection established");
      connectedClients.add(ws);

      const sendPriceUpdates = async (symbols: string[]) => {
        if (ws.readyState !== ws.OPEN) {
          log('WebSocket not in OPEN state, skipping price update');
          return;
        }

        try {
          for (const symbol of symbols) {
            const priceData = await cryptoService.getPriceData(symbol);
            if (!priceData) {
              log(`No price data available for ${symbol}`);
              continue;
            }

            const data: CryptoData = {
              symbol,
              price: priceData.price.toFixed(2),
              change24h: priceData.change24h.toFixed(2)
            };

            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify(data));
            } else {
              log('WebSocket state changed during price update, stopping');
              break;
            }
          }
        } catch (error) {
          log(`Price update error: ${error instanceof Error ? error.message : String(error)}`);
        }
      };

      // Start price updates with interval tracking
      const updateInterval = setInterval(() => {
        const activeSymbols = cryptoService.getActiveSymbols();
        if (activeSymbols.length > 0) {
          sendPriceUpdates(activeSymbols);
        }
      }, 10000);

      // Error handling with proper cleanup
      ws.on("error", (error: Error) => {
        log(`WebSocket error: ${error.message}`);
        clearInterval(updateInterval);
        connectedClients.delete(ws);
        try {
          ws.close();
        } catch (closeError) {
          log(`Error while closing WebSocket: ${closeError}`);
        }
      });

      // Cleanup on close
      ws.on("close", () => {
        log("Client disconnected, cleaning up resources");
        clearInterval(updateInterval);
        connectedClients.delete(ws);
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`WebSocket connection error: ${errorMessage}`);
      connectedClients.delete(ws);
      try {
        ws.close();
      } catch (closeError) {
        log(`Error while closing WebSocket after error: ${closeError}`);
      }
    }
  });

  // Market overview endpoint
  app.get("/api/market/overview", async (_req, res) => {
    try {
      const marketData = await cryptoService.getMarketOverview();
      res.json(marketData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Market overview error: ${errorMessage}`);
      res.status(500).json({ 
        error: "Failed to fetch market overview",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // Subscription endpoints
  app.get("/api/subscription/plans", async (_req, res) => {
    try {
      const plans = await subscriptionService.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Subscription plans error: ${errorMessage}`);
      res.status(500).json({ 
        error: "Failed to fetch subscription plans",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Subscription verification error: ${errorMessage}`);
      res.status(500).json({ 
        error: "Failed to verify subscription",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // Chat endpoint
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
      log(`Chat error: ${errorMessage}`);
      res.status(500).json({ 
        error: "Failed to process chat message",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
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
        websocket_clients: wss.clients.size,
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