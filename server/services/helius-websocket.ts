import WebSocket from 'ws';
import { wsManager } from './websocket';
import { tokenMetricsService } from './token-metrics';

class HeliusWebSocketManager {
  private ws: WebSocket | null = null;
  private initialized = false;

  initialize() {
    // This service is now handled entirely on the frontend
    // to ensure all logs are visible in the browser console
    console.log('[Helius Backend] Service moved to frontend for better visibility');
    this.initialized = true;
  }
}

export const heliusWsManager = new HeliusWebSocketManager();