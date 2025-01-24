import { useUnifiedTokenStore } from './unified-token-store';
import { initializeHeliusWebSocket } from './helius-websocket';
import { initializePumpPortalWebSocket } from './pump-portal-websocket';

export function initializeUnifiedWebSocket() {
  if (typeof window === 'undefined') return;

  // Initialize both WebSocket connections
  initializeHeliusWebSocket();
  initializePumpPortalWebSocket();
}

// Initialize WebSocket connection
initializeUnifiedWebSocket();