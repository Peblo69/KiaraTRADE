// API service for backend integration
import { TokenData, Trade, AutoSellSettings } from '../types/token';

export const API_ENDPOINTS = {
  TOKENS: '/api/tokens',
  TRADES: '/api/trades',
  ORDERS: '/api/orders',
};

export const TokenService = {
  // Fetch token details
  getToken: async (tokenId: string): Promise<TokenData> => {
    const response = await fetch(`${API_ENDPOINTS.TOKENS}/${tokenId}`);
    return response.json();
  },

  // Get trading history
  getTrades: async (tokenId: string): Promise<Trade[]> => {
    const response = await fetch(`${API_ENDPOINTS.TRADES}/${tokenId}`);
    return response.json();
  },

  // Submit buy order
  submitBuyOrder: async (tokenId: string, amount: string, orderType: string, autoSell?: AutoSellSettings) => {
    const response = await fetch(`${API_ENDPOINTS.ORDERS}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId, amount, orderType, autoSell })
    });
    return response.json();
  },

  // Submit sell order
  submitSellOrder: async (tokenId: string, amount: string, orderType: string) => {
    const response = await fetch(`${API_ENDPOINTS.ORDERS}/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId, amount, orderType })
    });
    return response.json();
  }
};