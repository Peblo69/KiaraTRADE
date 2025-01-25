import { db } from "@db";
import { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from 'ws';
import { log } from './vite';

export function registerRoutes(app: Express): Server {  
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer });

  // Connect to PumpPortal
  const pumpPortalWs = new WebSocket('wss://pump.fun/v1/ws');

  // Forward PumpPortal messages to all clients
  pumpPortalWs.on('message', (data) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });

  // Handle client connections
  wss.on('connection', (ws) => {
    log('[PumpPortal] Client connected');

    // Forward client messages to PumpPortal
    ws.on('message', (data) => {
      if (pumpPortalWs.readyState === WebSocket.OPEN) {
        pumpPortalWs.send(data.toString());
      }
    });
  });

  log('Routes registered successfully');
  return httpServer;
}