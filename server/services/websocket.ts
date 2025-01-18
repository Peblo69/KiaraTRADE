import type { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    // Send initial connection status
    ws.send(JSON.stringify({ 
      type: 'connection_status',
      data: { connected: true }
    }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        console.log('Received message:', parsed);

        // Handle different message types here if needed
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  // Broadcast to all connected clients
  wss.broadcast = function(data: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  return wss;
}