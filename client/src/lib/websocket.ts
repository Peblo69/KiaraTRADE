// This file is kept as a placeholder for future WebSocket implementation
// Currently using REST API for price updates

export interface BinanceTickerData {
  symbol: string;
  price: string;
  change24h: string;
}

export function connectToWebSocket() {
  return null;
}

export function disconnectWebSocket() {
  // No-op
}