import axios from 'axios';
import type { Token, TokenTrade } from './schema';

// Client-side database interface that uses API calls
export const db = {
  async query(endpoint: string, data?: any) {
    try {
      const response = await axios.post(`/api/${endpoint}`, data);
      return response.data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  async createToken(token: Omit<Token, 'created_at'>): Promise<Token> {
    const response = await axios.post('/api/tokens', token);
    return response.data;
  },

  async createTrade(trade: Omit<TokenTrade, 'timestamp'>): Promise<TokenTrade> {
    const response = await axios.post('/api/trades', trade);
    return response.data;
  },

  async getToken(address: string): Promise<Token | null> {
    try {
      const response = await axios.get(`/api/tokens/${address}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch token:', error);
      return null;
    }
  },

  async getTokenTrades(address: string): Promise<TokenTrade[]> {
    try {
      const response = await axios.get(`/api/tokens/${address}/trades`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch token trades:', error);
      return [];
    }
  }
};