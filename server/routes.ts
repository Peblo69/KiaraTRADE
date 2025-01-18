import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { WebSocket } from 'ws';
import { generateAIResponse } from './services/ai';
import axios from 'axios';
import { getTokenImage, addPriorityToken } from './image-worker';

// Cache structure for KuCoin data
const cache = {
  prices: { data: null, timestamp: 0 },
  stats24h: { data: null, timestamp: 0 },
  trending: { data: null, timestamp: 0 }
};

const CACHE_DURATION = 30000; // 30 seconds cache
const KUCOIN_API_BASE = 'https://api.kucoin.com/api/v1';

// Configure axios with timeout and headers
axios.defaults.timeout = 10000;
axios.defaults.headers.common['accept'] = 'application/json';

// Add request interceptor for rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 20; // Minimum 20ms between requests (KuCoin allows up to 50 requests per second)

axios.interceptors.request.use(async (config) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return config;
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket manager
  wsManager.initialize(httpServer);

  // Token image endpoints
  app.get('/api/token-image/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol;
      console.log(`[Routes] Fetching image for token: ${symbol}`);

      const imageUrl = await getTokenImage(symbol);
      console.log(`[Routes] Image URL for ${symbol}:`, imageUrl);

      res.json({ imageUrl });
    } catch (error: any) {
      console.error('[Routes] Token image error:', error);
      res.status(500).json({
        error: 'Failed to fetch token image',
        details: error.message
      });
    }
  });

  app.post('/api/token-images/bulk', async (req, res) => {
    try {
      const { symbols, priority = false } = req.body;
      console.log(`[Routes] Bulk image request for ${symbols.length} tokens`);

      if (!Array.isArray(symbols)) {
        return res.status(400).json({ error: 'symbols must be an array' });
      }

      const images: Record<string, string> = {};

      // Add to priority queue if specified
      if (priority) {
        symbols.forEach(symbol => {
          console.log(`[Routes] Adding ${symbol} to priority queue`);
          addPriorityToken(symbol);
        });
      }

      await Promise.all(
        symbols.map(async (symbol) => {
          images[symbol] = await getTokenImage(symbol);
        })
      );

      console.log(`[Routes] Returning ${Object.keys(images).length} images`);
      res.json({ images });
    } catch (error: any) {
      console.error('[Routes] Bulk token images error:', error);
      res.status(500).json({
        error: 'Failed to fetch bulk token images',
        details: error.message
      });
    }
  });

  // New endpoint to serve all stored images
  app.get('/api/token-images/stored', async (req, res) => {
    try {
      console.log('[Routes] Fetching all stored token images');

      // Get all mappings first
      const mappings = await db
        .select()
        .from(coinMappings);

      // Get all images
      const images = await db
        .select()
        .from(coinImages);

      // Create a map of symbol to image URL
      const imageMap: Record<string, string> = {};

      // Map CoinGecko IDs to KuCoin symbols
      const idToSymbol = mappings.reduce((acc: Record<string, string>, mapping) => {
        acc[mapping.coingecko_id] = mapping.kucoin_symbol;
        return acc;
      }, {});

      // Create final mapping of symbols to image URLs
      images.forEach(image => {
        const symbol = idToSymbol[image.coingecko_id];
        if (symbol) {
          imageMap[symbol] = image.image_url;
        }
      });

      console.log(`[Routes] Returning ${Object.keys(imageMap).length} stored images`);
      res.json({ images: imageMap });
    } catch (error: any) {
      console.error('[Routes] Error fetching stored images:', error);
      res.status(500).json({
        error: 'Failed to fetch stored images',
        details: error.message
      });
    }
  });


  // Market data endpoint
  app.get('/api/coins/markets', async (req, res) => {
    try {
      const now = Date.now();
      if (cache.prices.data && (now - cache.prices.timestamp) < CACHE_DURATION) {
        return res.json(cache.prices.data);
      }

      // Fetch all USDT markets stats
      const response = await axios.get(`${KUCOIN_API_BASE}/market/allTickers`);

      cache.prices = {
        data: response.data,
        timestamp: now
      };

      res.json(response.data);
    } catch (error: any) {
      console.error('Markets error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch market data',
        details: error.response?.data?.msg || error.message
      });
    }
  });

  // Single coin details endpoint with price history
  app.get('/api/coins/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol;

      const [marketStats, klines] = await Promise.all([
        axios.get(`${KUCOIN_API_BASE}/market/stats`, {
          params: { symbol }
        }),
        axios.get(`${KUCOIN_API_BASE}/market/candles`, {
          params: {
            symbol,
            type: '1day',
            startAt: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000),
            endAt: Math.floor(Date.now() / 1000)
          }
        })
      ]);

      // KuCoin returns klines in reverse order [timestamp, open, close, high, low, volume, turnover]
      const prices = klines.data.data
        .reverse()
        .map((kline: string[]) => [parseInt(kline[0]) * 1000, parseFloat(kline[2])]);

      const response = {
        stats: marketStats.data.data,
        chart: {
          prices
        }
      };

      res.json(response);
    } catch (error: any) {
      console.error('Coin details error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch coin details',
        details: error.response?.data?.msg || error.message
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

      const response = await axios.get(`${KUCOIN_API_BASE}/market/allTickers`);
      const markets = response.data.data.ticker.filter((t: any) => t.symbol.endsWith('-USDT'));

      // Sort by volume and take top 10
      const trending = markets
        .sort((a: any, b: any) => parseFloat(b.volValue) - parseFloat(a.volValue))
        .slice(0, 10)
        .map((market: any) => {
          const symbol = market.symbol.replace('-USDT', '');
          const metadata = getCoinMetadata(symbol);
          return {
            item: {
              id: symbol.toLowerCase(),
              coin_id: symbol.toLowerCase(),
              name: metadata.name,
              symbol: symbol.toLowerCase(),
              market_cap_rank: null,
              thumb: metadata.image,
              small: metadata.image,
              large: metadata.image,
              score: parseFloat(market.volValue)
            }
          };
        });

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
        details: error.response?.data?.msg || error.message
      });
    }
  });

  // Klines (candlestick) endpoint with configurable timeframe
  app.get('/api/coins/:symbol/klines', async (req, res) => {
    try {
      const symbol = req.params.symbol;
      const timeframe = req.query.timeframe || '1d';

      // Map frontend timeframes to KuCoin timeframes
      const timeframeMap: Record<string, string> = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1h': '1hour',
        '4h': '4hour',
        '1d': '1day',
        '1w': '1week'
      };

      const kucoinTimeframe = timeframeMap[timeframe as string] || '1day';

      // Calculate start time based on timeframe (up to 1500 candles)
      const now = Math.floor(Date.now() / 1000);
      let startTime = now;

      switch(timeframe) {
        case '1m': startTime = now - (60 * 1500); break;       // 1500 minutes
        case '5m': startTime = now - (300 * 1500); break;      // 5200 minutes
        case '15m': startTime = now - (900 * 1500); break;     // 15600 minutes
        case '30m': startTime = now - (1800 * 1500); break;    // 31200 minutes
        case '1h': startTime = now - (3600 * 1500); break;     // 2.5 months
        case '4h': startTime = now - (14400 * 1500); break;    // 10 months
        case '1d': startTime = now - (86400 * 1500); break;    // 4.1 years
        case '1w': startTime = now - (604800 * 1500); break;   // 28.8 years
        default: startTime = now - (86400 * 365); // 1 year default
      }

      const response = await axios.get(`${KUCOIN_API_BASE}/market/candles`, {
        params: {
          symbol,
          type: kucoinTimeframe,
          startAt: startTime,
          endAt: now
        }
      });

      // KuCoin returns klines in format: [timestamp, open, close, high, low, volume, turnover]
      const klines = response.data.data.map((kline: string[]) => ({
        time: parseInt(kline[0]),
        open: parseFloat(kline[1]),
        close: parseFloat(kline[2]),
        high: parseFloat(kline[3]),
        low: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        turnover: parseFloat(kline[6])
      }));

      res.json({ klines });
    } catch (error: any) {
      console.error('Klines error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch klines data',
        details: error.response?.data?.msg || error.message
      });
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

// Basic coin metadata mapping
const COIN_METADATA: Record<string, { name: string, image: string }> = {
  'BTC': {
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
  },
  'ETH': {
    name: 'Ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
  },
  'SOL': {
    name: 'Solana',
    image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png'
  },
  'USDT': {
    name: 'Tether',
    image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png'
  },
  'XRP': {
    name: 'XRP',
    image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png'
  }
};

// Helper function to get coin metadata
const getCoinMetadata = (symbol: string) => {
  const cleanSymbol = symbol.replace('-USDT', '');
  return COIN_METADATA[cleanSymbol] || {
    name: cleanSymbol,
    image: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${cleanSymbol.toLowerCase()}.png`
  };
};

// Helper function to format KuCoin data to match our frontend expectations
const formatKuCoinData = (markets: any[]) => {
  return markets.map(market => {
    if (!market.symbol.endsWith('-USDT')) return null;

    const symbol = market.symbol.replace('-USDT', '');
    const metadata = getCoinMetadata(symbol);
    return {
      id: symbol.toLowerCase(),
      symbol: symbol,
      name: metadata.name,
      image: metadata.image,
      current_price: parseFloat(market.last),
      market_cap: parseFloat(market.volValue),
      market_cap_rank: null,
      total_volume: parseFloat(market.vol),
      high_24h: parseFloat(market.high),
      low_24h: parseFloat(market.low),
      price_change_percentage_24h: parseFloat(market.changeRate) * 100,
      price_change_percentage_1h_in_currency: null,
      price_change_percentage_7d_in_currency: null,
      last_updated: new Date(market.time).toISOString(),
      sparkline_in_7d: { price: [] }
    };
  }).filter(Boolean);
};

// Placeholder for priority queue functionality
const priorityQueue: string[] = [];
const addPriorityToken = (symbol: string) => {
  priorityQueue.push(symbol);
  console.log(`Added ${symbol} to priority queue.`);
};