import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Set up authentication routes
  setupAuth(app);

  return httpServer;
}