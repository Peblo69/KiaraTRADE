import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { WebSocket } from 'ws';
import { generateAIResponse } from './services/ai';
import axios from 'axios';

// Cache structure for Binance data
const cache = {
  prices: { data: null, timestamp: 0 },
  stats24h: { data: null, timestamp: 0 },
  trending: { data: null, timestamp: 0 }
};

const CACHE_DURATION = 30000; // 30 seconds cache
const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

// Configure axios with timeout and headers
axios.defaults.timeout = 10000;
axios.defaults.headers.common['accept'] = 'application/json';

// Add request interceptor for rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // Minimum 100ms between requests (Binance allows up to 1200 requests per minute)

axios.interceptors.request.use(async (config) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return config;
});

// Helper function to format Binance data to match our frontend expectations
const formatBinanceData = (prices: any[], stats24h: any[]) => {
  return prices.map(price => {
    const stat = stats24h.find(s => s.symbol === price.symbol);
    if (!stat) return null;

    return {
      id: price.symbol.toLowerCase(),
      symbol: price.symbol,
      name: price.symbol, // We'll need to maintain a separate mapping for full names
      current_price: parseFloat(price.price),
      market_cap: parseFloat(stat.quoteVolume),
      market_cap_rank: null,
      total_volume: parseFloat(stat.volume),
      high_24h: parseFloat(stat.highPrice),
      low_24h: parseFloat(stat.lowPrice),
      price_change_percentage_24h: parseFloat(stat.priceChangePercent),
      price_change_percentage_1h_in_currency: null, // Need to calculate from klines
      price_change_percentage_7d_in_currency: null, // Need to calculate from klines
      last_updated: new Date(stat.closeTime).toISOString(),
      sparkline_in_7d: { price: [] } // Need to fetch from klines endpoint
    };
  }).filter(Boolean);
};

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket manager
  wsManager.initialize(httpServer);

  // Market data endpoint
  app.get('/api/coins/markets', async (req, res) => {
    try {
      const now = Date.now();
      if (cache.prices.data && (now - cache.prices.timestamp) < CACHE_DURATION) {
        return res.json(cache.prices.data);
      }

      // Fetch both price ticker and 24h stats
      const [pricesResponse, stats24hResponse] = await Promise.all([
        axios.get(`${BINANCE_API_BASE}/ticker/price`),
        axios.get(`${BINANCE_API_BASE}/ticker/24hr`)
      ]);

      const formattedData = formatBinanceData(pricesResponse.data, stats24hResponse.data);

      cache.prices = {
        data: formattedData,
        timestamp: now
      };

      res.json(formattedData);
    } catch (error: any) {
      console.error('Markets error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch market data',
        details: error.response?.data?.error || error.message 
      });
    }
  });

  // Single coin details endpoint with price history
  app.get('/api/coins/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();

      const [ticker24h, klines] = await Promise.all([
        axios.get(`${BINANCE_API_BASE}/ticker/24hr`, {
          params: { symbol }
        }),
        axios.get(`${BINANCE_API_BASE}/klines`, {
          params: {
            symbol,
            interval: '1d',
            limit: 7 // Last 7 days
          }
        })
      ]);

      const prices = klines.data.map((kline: any[]) => [kline[0], parseFloat(kline[4])]); // [timestamp, close]

      const response = {
        id: symbol.toLowerCase(),
        symbol: symbol,
        name: symbol, // Would need mapping for full names
        description: { en: '' }, // Would need separate mapping
        market_data: {
          current_price: { usd: parseFloat(ticker24h.data.lastPrice) },
          market_cap: { usd: parseFloat(ticker24h.data.quoteVolume) },
          total_volume: { usd: parseFloat(ticker24h.data.volume) },
          high_24h: { usd: parseFloat(ticker24h.data.highPrice) },
          low_24h: { usd: parseFloat(ticker24h.data.lowPrice) }
        },
        market_chart: {
          prices
        }
      };

      res.json(response);
    } catch (error: any) {
      console.error('Coin details error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch coin details',
        details: error.response?.data?.error || error.message 
      });
    }
  });

  // Trending coins endpoint (using top volume from 24h stats)
  app.get('/api/trending', async (req, res) => {
    try {
      const now = Date.now();
      if (cache.trending.data && (now - cache.trending.timestamp) < CACHE_DURATION) {
        return res.json(cache.trending.data);
      }

      const response = await axios.get(`${BINANCE_API_BASE}/ticker/24hr`);

      // Sort by volume and take top 10
      const trending = response.data
        .sort((a: any, b: any) => parseFloat(b.volume) - parseFloat(a.volume))
        .slice(0, 10)
        .map((coin: any) => ({
          item: {
            id: coin.symbol.toLowerCase(),
            coin_id: coin.symbol.toLowerCase(),
            name: coin.symbol,
            symbol: coin.symbol.toLowerCase(),
            market_cap_rank: null,
            thumb: '', // Would need separate mapping for images
            small: '',
            large: '',
            score: parseFloat(coin.volume)
          }
        }));

      const trendingResponse = { coins: trending };

      cache.trending = {
        data: trendingResponse,
        timestamp: now
      };

      res.json(trendingResponse);
    } catch (error: any) {
      console.error('Trending error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch trending coins',
        details: error.response?.data?.error || error.message 
      });
    }
  });

  // Chat endpoint (unchanged)
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