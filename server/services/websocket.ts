import { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

declare module 'ws' {
  interface WebSocket {
    isAlive: boolean;
  }
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: HttpServer) {
    if (this.wss) return;

    this.wss = new WebSocketServer({ 
      noServer: true,
      perMessageDeflate: false
    });

    server.on('upgrade', (request, socket, head) => {
      if (request.headers['sec-websocket-protocol']?.includes('vite-hmr')) return;
      if (!this.wss) return;

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        if (this.clients.has(ws)) return;
        this.wss!.emit('connection', ws, request);
      });
    });

    this.wss.on('connection', (ws: WebSocket) => {
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
        } catch (error) {}
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });

      this.sendToClient(ws, {
        type: 'connection_status',
        status: 'connected'
      });
    });

    this.heartbeatInterval = setInterval(() => {
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
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    });
  }

  private sendToClient(client: WebSocket, data: any) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(data));
      } catch (error) {
        this.clients.delete(client);
      }
    }
  }

  broadcast(data: any) {
    if (!this.wss) return;

    const message = JSON.stringify(data);
    Array.from(this.clients).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
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