import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocketServer } from "./services/websocket";
import { setupBitqueryWebSocket } from "./services/bitquery-ws";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket server for client connections
  const wss = setupWebSocketServer(httpServer);

  // Initialize Bitquery WebSocket connection
  // This will stream new token data to connected clients
  setupBitqueryWebSocket((tokenData) => {
    // Broadcast new token data to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'token_update',
          data: tokenData
        }));
      }
    });
  });

  return httpServer;
}