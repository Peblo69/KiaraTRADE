import WebSocket from 'ws';

class WebSocketManager {
  private clients: Set<WebSocket> = new Set();

  // Add a new WebSocket client to the manager
  addClient(client: WebSocket) {
    this.clients.add(client);
    console.log('[WebSocketManager] Client connected. Total clients:', this.clients.size);

    // Remove the client when it disconnects
    client.on('close', () => {
      this.clients.delete(client);
      console.log('[WebSocketManager] Client disconnected. Total clients:', this.clients.size);
    });
  }

  // Broadcast a message to all connected clients
  broadcast(message: any) {
    const messageString = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
    console.log('[WebSocketManager] Message broadcasted to all clients:', message);
  }
}

// Create a single instance of the WebSocketManager
export const wsManager = new WebSocketManager();
