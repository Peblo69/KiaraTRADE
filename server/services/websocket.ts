import { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: HttpServer) {
    if (this.wss) {
      console.log('[WebSocket Manager] WebSocket server already initialized');
      return;
    }

    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket, req) => {
      // Skip vite-hmr connections
      if (req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
        console.log('[WebSocket] Skipping vite-hmr connection');
        return;
      }

      console.log('[WebSocket Manager] New client connected');
      this.clients.add(ws);

      ws.on('close', () => {
        console.log('[WebSocket Manager] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[WebSocket Manager] Client error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection success message
      ws.send(JSON.stringify({
        type: 'connection_status',
        status: 'connected'
      }));
    });

    console.log('[WebSocket Manager] WebSocket server initialized');
  }

  broadcast(data: any) {
    if (!this.wss) {
      console.warn('[WebSocket Manager] Cannot broadcast, server not initialized');
      return;
    }

    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();