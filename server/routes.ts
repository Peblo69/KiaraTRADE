import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { generateAIResponse } from "./services/ai";
import { cryptoService } from "./services/crypto";
import { log } from "./vite";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    subscription_tier: string;
  };
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

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