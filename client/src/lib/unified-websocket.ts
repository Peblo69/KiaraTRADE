
import { useUnifiedTokenStore } from './unified-token-store';
import { initializeHeliusWebSocket } from './helius-websocket';
import { initializePumpPortalWebSocket } from './pump-portal-websocket';

export function initializeUnifiedWebSocket() {
  const store = useUnifiedTokenStore.getState();
  
  // Initialize both WebSocket connections
  initializeHeliusWebSocket();
  initializePumpPortalWebSocket();
  
  // Request updates for existing tokens
  const existingTokens = store.tokens;
  if (existingTokens.length > 0) {
    const tokenAddresses = existingTokens.map(t => t.address);
    console.log('[Unified] Requesting updates for existing tokens:', tokenAddresses.length);
  }
}

// Initialize WebSocket connection
initializeUnifiedWebSocket();
