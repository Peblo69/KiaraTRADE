import WebSocket from 'ws';
import { EventEmitter } from 'events';

console.log('🔌 WEBSOCKET MANAGER CONFIG:', {
    wsUrl: process.env.PUMPPORTAL_WS_URL
});

class WebSocketManager extends EventEmitter {
    private connections: Map<string, WebSocket> = new Map();
    private reconnectAttempts: Map<string, number> = new Map();
    private readonly MAX_RECONNECT_ATTEMPTS = 5;
    private readonly RECONNECT_DELAY = 1000;
    private server: any = null;

    constructor() {
        super();
        console.log('🌟 Initializing WebSocket Manager');
    }

    initialize(server: any) {
        this.server = server;
        console.log('[WebSocket Manager] WebSocket server initialized');
    }

    connect(url: string, id: string): WebSocket {
        if (this.connections.has(id)) {
            return this.connections.get(id)!;
        }

        console.log(`🔌 Connecting to ${id} at ${url}`);

        const ws = new WebSocket(url);

        ws.on('open', () => {
            console.log(`[WebSocket] Connected: ${id}`);
            this.reconnectAttempts.set(id, 0);
            this.emit('connected', id);
        });

        ws.on('close', () => {
            console.log(`[WebSocket] Closed: ${id}`);
            this.handleReconnect(url, id);
            this.emit('disconnected', id);
        });

        ws.on('error', (error) => {
            console.error(`[WebSocket] Error for ${id}:`, error.message);
            this.emit('error', { id, error });
        });

        this.connections.set(id, ws);
        return ws;
    }

    private handleReconnect(url: string, id: string) {
        const attempts = this.reconnectAttempts.get(id) || 0;

        if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
            console.log(`[WebSocket] Attempting to reconnect ${id} (${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);

            setTimeout(() => {
                this.reconnectAttempts.set(id, attempts + 1);
                this.connect(url, id);
            }, this.RECONNECT_DELAY * Math.pow(2, attempts));
        } else {
            console.error(`[WebSocket] Max reconnection attempts reached for ${id}`);
            this.emit('max_attempts_reached', id);
        }
    }

    disconnect(id: string) {
        const ws = this.connections.get(id);
        if (ws) {
            ws.close();
            this.connections.delete(id);
            this.reconnectAttempts.delete(id);
        }
    }

    broadcast(message: any) {
        const data = JSON.stringify(message);
        this.connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });
    }

    isConnected(id: string): boolean {
        const ws = this.connections.get(id);
        return ws?.readyState === WebSocket.OPEN;
    }
}

export const wsManager = new WebSocketManager();