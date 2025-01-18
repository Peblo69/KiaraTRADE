import { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

// Extend WebSocket type to include isAlive property
declare module 'ws' {
  interface WebSocket {
    isAlive: boolean;
  }
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: HttpServer) {
    if (this.wss) {
      console.log('[WebSocket Manager] WebSocket server already initialized');
      return;
    }

    // Create WebSocket server with proper upgrade handling
    this.wss = new WebSocketServer({ 
      noServer: true,
      perMessageDeflate: false
    });

    // Handle upgrade separately to properly handle vite-hmr
    server.on('upgrade', (request, socket, head) => {
      // Skip vite-hmr connections
      if (request.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
        console.log('[WebSocket] Skipping vite-hmr connection');
        return;
      }

      if (!this.wss) return;

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss!.emit('connection', ws, request);
      });
    });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WebSocket Manager] New client connected');

      // Initialize connection state
      ws.isAlive = true;
      this.clients.add(ws);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'ping') {
            this.sendToClient(ws, { type: 'pong' });
          }
        } catch (error) {
          console.error('[WebSocket Manager] Error processing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket Manager] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[WebSocket Manager] Client error:', error);
        this.clients.delete(ws);
      });

      // Send initial connection success message
      this.sendToClient(ws, {
        type: 'connection_status',
        status: 'connected'
      });
    });

    // Setup heartbeat interval for connection monitoring
    const heartbeatInterval = setInterval(() => {
      Array.from(this.clients).forEach(client => {
        if (client.isAlive === false) {
          this.clients.delete(client);
          client.terminate();
          return;
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(heartbeatInterval);
    });

    console.log('[WebSocket Manager] WebSocket server initialized');
  }

  private sendToClient(client: WebSocket, data: any) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
      } catch (error) {
        console.error('[WebSocket Manager] Error sending to client:', error);
        this.clients.delete(client);
      }
    }
  }

  broadcast(data: any) {
    if (!this.wss) {
      console.warn('[WebSocket Manager] Cannot broadcast, server not initialized');
      return;
    }

    const message = JSON.stringify(data);
    Array.from(this.clients).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('[WebSocket Manager] Error broadcasting to client:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();