import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { initializePumpPortalWebSocket } from './pumpportal';
import axios from 'axios';
import express from 'express';

// Constants
const CACHE_DURATION = 30000; // 30 seconds cache
const INTERNAL_PORT = 5000;
const DEBUG = true;

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

function debugLog(source: string, message: string, data?: any) {
  if (DEBUG) {
    console.log(`[${source}] ${message}`, data ? data : '');
  }
}

export function registerRoutes(app: Express): Server {
  debugLog('Server', `Initializing server for user ${process.env.REPL_OWNER || 'unknown'}`);

  const server = createServer(app);

  // Initialize WebSocket manager with server instance
  wsManager.initialize(server);

  // Initialize PumpPortal WebSocket
  initializePumpPortalWebSocket();

  // Error handling for the server
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${INTERNAL_PORT} is in use. Please wait...`);
      setTimeout(() => {
        server.close();
        server.listen(INTERNAL_PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.error('❌ Server error:', error);
    }
  });

  // Start server
  try {
    server.close(); // Close any existing connections first
    server.listen(INTERNAL_PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server Status:`);
      console.log(`📡 Internal: Running on 0.0.0.0:${INTERNAL_PORT}`);
      console.log(`🌍 External: Mapped to port 3000`);
      console.log(`👤 User: ${process.env.REPL_OWNER || 'unknown'}`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      console.log(`\n✅ Server is ready to accept connections\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }

  // Add your routes here
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      port: INTERNAL_PORT,
      external_port: 3000
    });
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


  // Error handlers
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (error.code === 'EADDRINUSE') {
      console.log('⚠️ Port is busy, attempting restart...');
      process.exit(1); // Replit will automatically restart
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });

  ['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      process.exit(0);
    });
  });

  return server;
}

// Helper functions
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
const NEWSDATA_API_BASE = 'https://newsdata.io/api/1';
const KUCOIN_API_BASE = 'https://api.kucoin.com/api/v1';
const cache = {
  prices: { data: null, timestamp: 0 },
    stats24h: { data: null, timestamp: 0 },
  trending: { data: null, timestamp: 0 },
  news: { data: null, timestamp: 0 }
};

import { generateAIResponse } from './services/ai';
import { getTokenImage } from './image-worker';
import { pricePredictionService } from './services/price-prediction';
import { cryptoService } from './services/crypto'; // Import the crypto service

interface TokenAnalytics {
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: number;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    mutable: boolean;
    created: number;
    supply: number;
  };
  holders: {
    total: number;
    unique: number;
    top10: Array<{
      address: string;
      balance: number;
      percentage: number;
    }>;
    concentration: {
      top10Percentage: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
    distribution: Array<{
      name: string;
      holders: number;
    }>;
  };
  snipers: {
    total: number;
    details: Array<{
      address: string;
      amount: number;
      timestamp: number;
    }>;
    volume: number;
    averageAmount: number;
  };
  trading: {
    volume24h: number;
    transactions24h: number;
    averageTradeSize: number;
    priceImpact: number;
  };
  risks: Array<{
    name: string;
    score: number;
  }>;
  rugScore: number;
}