import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { WebSocket } from 'ws';
import { generateAIResponse } from './services/ai';
import axios from 'axios';

// Cache for CoinGecko data
const cache = {
  globalMetrics: { data: null, timestamp: 0 },
  trending: { data: null, timestamp: 0 },
  topCoins: { data: null, timestamp: 0 }
};
const CACHE_DURATION = 30000; // 30 seconds cache

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket manager
  wsManager.initialize(httpServer);

  // Global metrics endpoint
  app.get('/api/global-metrics', async (req, res) => {
    try {
      // Check cache
      const now = Date.now();
      if (cache.globalMetrics.data && (now - cache.globalMetrics.timestamp) < CACHE_DURATION) {
        return res.json(cache.globalMetrics.data);
      }

      const response = await axios.get('https://api.coingecko.com/api/v3/global');

      // Cache the response
      cache.globalMetrics = {
        data: response.data,
        timestamp: now
      };

      res.json(response.data);
    } catch (error: any) {
      console.error('Global metrics error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: error.message || 'Failed to fetch global metrics' });
    }
  });

  // Top coins by market cap endpoint with detailed information
  app.get('/api/coins/markets', async (req, res) => {
    try {
      const now = Date.now();
      if (cache.topCoins.data && (now - cache.topCoins.timestamp) < CACHE_DURATION) {
        return res.json(cache.topCoins.data);
      }

      const response = await axios.get(
        'https://api.coingecko.com/api/v3/coins/markets',
        {
          params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 100,
            page: 1,
            sparkline: true,
            price_change_percentage: '1h,24h,7d',
            locale: 'en',
            precision: 6
          }
        }
      );

      cache.topCoins = {
        data: response.data,
        timestamp: now
      };

      res.json(response.data);
    } catch (error: any) {
      console.error('Markets error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: error.message || 'Failed to fetch market data' });
    }
  });

  // Get detailed information for a specific coin with price history
  app.get('/api/coins/:id', async (req, res) => {
    try {
      const [coinData, marketChart] = await Promise.all([
        axios.get(
          `https://api.coingecko.com/api/v3/coins/${req.params.id}`,
          {
            params: {
              localization: false,
              tickers: true,
              market_data: true,
              community_data: true,
              developer_data: true,
              sparkline: true
            }
          }
        ),
        axios.get(
          `https://api.coingecko.com/api/v3/coins/${req.params.id}/market_chart`,
          {
            params: {
              vs_currency: 'usd',
              days: 7,
              interval: 'hourly'
            }
          }
        )
      ]);

      const response = {
        ...coinData.data,
        market_chart: marketChart.data
      };

      res.json(response);
    } catch (error: any) {
      console.error('Coin details error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: error.message || 'Failed to fetch coin details' });
    }
  });

  // Trending coins endpoint
  app.get('/api/trending', async (req, res) => {
    try {
      const now = Date.now();
      if (cache.trending.data && (now - cache.trending.timestamp) < CACHE_DURATION) {
        return res.json(cache.trending.data);
      }

      const response = await axios.get('https://api.coingecko.com/api/v3/search/trending');

      cache.trending = {
        data: response.data,
        timestamp: now
      };

      res.json(response.data);
    } catch (error: any) {
      console.error('Trending error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: error.message || 'Failed to fetch trending coins' });
    }
  });

  // Chat endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, sessionId } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get or initialize chat history for this session
      if (!chatHistory[sessionId]) {
        chatHistory[sessionId] = [];
      }

      // Generate response using our AI service
      const response = await generateAIResponse(message, chatHistory[sessionId]);

      // Update chat history
      chatHistory[sessionId].push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );

      // Keep only last 10 messages to prevent context from growing too large
      if (chatHistory[sessionId].length > 20) {
        chatHistory[sessionId] = chatHistory[sessionId].slice(-20);
      }

      res.json({ response });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message || 'Failed to process chat request' });
    }
  });

  return httpServer;
}

// In-memory data structure for chat history
const chatHistory: Record<string, any[]> = {};