import { WebSocket } from 'ws';
import { log } from '../vite';
import { cryptoService } from './crypto';

interface CryptoData {
  symbol: string;
  price: string;
  change24h: string;
}

class WebSocketManager {
  private clients: Map<WebSocket, NodeJS.Timeout> = new Map();

  addClient(ws: WebSocket) {
    log("New WebSocket client connected");
    
    const sendPriceUpdates = async () => {
      if (ws.readyState !== ws.OPEN) {
        return;
      }

      const activeSymbols = cryptoService.getActiveSymbols();
      for (const symbol of activeSymbols) {
        try {
          if (ws.readyState !== ws.OPEN) {
            break;
          }

          const priceData = await cryptoService.getPriceData(symbol);
          if (!priceData) continue;

          const data: CryptoData = {
            symbol,
            price: priceData.price.toFixed(2),
            change24h: priceData.change24h.toFixed(2)
          };

          ws.send(JSON.stringify(data));
        } catch (error) {
          log(`Price update error for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    // Set up interval for price updates
    const updateInterval = setInterval(sendPriceUpdates, 10000);
    this.clients.set(ws, updateInterval);

    // Setup error handler
    ws.on('error', (error: Error) => {
      log(`WebSocket error: ${error.message}`);
      this.removeClient(ws);
    });

    // Setup close handler
    ws.on('close', () => {
      log('WebSocket client disconnected');
      this.removeClient(ws);
    });
  }

  removeClient(ws: WebSocket) {
    const interval = this.clients.get(ws);
    if (interval) {
      clearInterval(interval);
    }
    this.clients.delete(ws);

    if (ws.readyState === ws.OPEN) {
      try {
        ws.close();
      } catch (error) {
        log(`Error closing WebSocket: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
