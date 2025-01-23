import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { heliusWsManager } from './services/helius-websocket';
import { generateAIResponse } from './services/ai';
import axios from 'axios';
import { getTokenImage, addPriorityToken } from './image-worker';

const CACHE_DURATION = 30000; // 30 seconds cache
const KUCOIN_API_BASE = 'https://api.kucoin.com/api/v1';
const NEWSDATA_API_BASE = 'https://newsdata.io/api/1';

// Configure axios with timeout and headers
axios.defaults.timeout = 10000;
axios.defaults.headers.common['accept'] = 'application/json';

// Add request interceptor for rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 20;

axios.interceptors.request.use(async (config) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return config;
});

// Cache structure for API data
const cache = {
  prices: { data: null, timestamp: 0 },
  stats24h: { data: null, timestamp: 0 },
  trending: { data: null, timestamp: 0 },
  news: { data: null, timestamp: 0 }
};

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize both WebSocket managers
  wsManager.initialize(httpServer);
  heliusWsManager.initialize();

  // Add crypto news endpoint
  app.get('/api/crypto-news', async (req, res) => {
    try {
      const now = Date.now();
      if (cache.news.data && (now - cache.news.timestamp) < CACHE_DURATION) {
        console.log('[Routes] Returning cached news data');
        return res.json(cache.news.data);
      }

      console.log('[Routes] Fetching fresh news from NewsData.io');

      const response = await axios.get(`${NEWSDATA_API_BASE}/news`, {
        params: {
          apikey: process.env.NEWSDATA_API_KEY,
          q: 'cryptocurrency OR bitcoin OR ethereum OR blockchain',
          language: 'en',
          category: 'business,technology',
        }
      });

      console.log('[Routes] NewsData.io response status:', response.status);

      if (!response.data.results || !Array.isArray(response.data.results)) {
        throw new Error('Invalid API response format');
      }

      // Process NewsData.io news
      const news = response.data.results.map((item: any) => ({
        title: item.title,
        text: item.description || item.title,
        news_url: item.link,
        source_name: item.source_id,
        date: item.pubDate,
        image_url: item.image_url
      }));

      const newsResponse = { articles: news };

      cache.news = {
        data: newsResponse,
        timestamp: now
      };

      console.log('[Routes] Sending news response with', news.length, 'articles');
      res.json(newsResponse);
    } catch (error: any) {
      console.error('[Routes] News fetch error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch crypto news',
        details: error.response?.data || error.message
      });
    }
  });

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

      console.log(`[Routes] Fetching klines for ${symbol} with timeframe ${kucoinTimeframe}`);

      const response = await axios.get(`${KUCOIN_API_BASE}/market/candles`, {
        params: {
          symbol,
          type: kucoinTimeframe,
          startAt: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000), // Last 7 days by default
          endAt: Math.floor(Date.now() / 1000)
        }
      });

      if (!response.data.data) {
        console.warn(`[Routes] No klines data received for ${symbol}`);
        return res.json({ klines: [] });
      }

      // KuCoin returns klines in reverse chronological order as arrays:
      // [timestamp, open, close, high, low, volume, turnover]
      const klines = response.data.data
        .reverse() // Reverse to get chronological order
        .map((k: string[]) => ({
          time: parseInt(k[0]), // Timestamp in seconds
          open: parseFloat(k[1]),
          close: parseFloat(k[2]),
          high: parseFloat(k[3]),
          low: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));

      console.log(`[Routes] Processed ${klines.length} klines for ${symbol}`);
      if (klines.length > 0) {
        console.log('[Routes] Sample kline:', klines[0]);
      }

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
    image: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/xrp.png'
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