import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocketServer } from "./services/websocket";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  setupWebSocketServer(httpServer);

  return httpServer;
}