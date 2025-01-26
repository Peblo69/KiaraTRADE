import { db } from "@db";
import { coinImages, coinMappings, rugcheck_results } from "@db/schema";
import { eq, gte } from "drizzle-orm";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { initializePumpPortalWebSocket } from './pumpportal';
import { generateAIResponse } from './services/ai';
import axios from 'axios';
import { getTokenImage } from './image-worker';
import { pricePredictionService } from './services/price-prediction';
import { cryptoService } from './services/crypto';

// Constants
const CACHE_DURATION = 30000; // 30 seconds cache
const RUGCHECK_COOLDOWN = 10000; // 10 seconds between rugchecks
const KUCOIN_API_BASE = 'https://api.kucoin.com/api/v1';
const NEWSDATA_API_BASE = 'https://newsdata.io/api/1';
const RUGCHECK_API_BASE = 'https://api.rugcheck.xyz/v1';

// Configure axios
axios.defaults.timeout = 10000;
axios.defaults.headers.common['accept'] = 'application/json';

// Rate limiting
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

// Cache structure
const cache = {
  prices: { data: null, timestamp: 0 },
  stats24h: { data: null, timestamp: 0 },
  trending: { data: null, timestamp: 0 },
  news: { data: null, timestamp: 0 }
};

if (!process.env.HELIUS_API_KEY) {
  throw new Error("HELIUS_API_KEY must be set in environment variables");
}

// Update Helius RPC URL with the working API key
const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=004f9b13-f526-4952-9998-52f5c7bec6ee';

function logHeliusError(error: any, context: string) {
  console.error(`[Helius ${context} Error]`, {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    url: error.config?.url,
    method: error.config?.method,
    params: error.config?.data
  });
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket manager
  wsManager.initialize(httpServer);

  // Initialize PumpPortal WebSocket
  initializePumpPortalWebSocket();

  // Add rugcheck endpoint
  app.get('/api/rugcheck/:mint', async (req, res) => {
    try {
      const { mint } = req.params;
      console.log(`[Routes] Getting rugcheck data for token ${mint}`);

      // Check if we have recent results
      const existingResult = await db.query.rugcheck_results.findFirst({
        where: eq(rugcheck_results.token_address, mint)
      });

      const now = new Date();
      if (existingResult && existingResult.last_checked_at) {
        const timeSinceLastCheck = now.getTime() - existingResult.last_checked_at.getTime();
        if (timeSinceLastCheck < RUGCHECK_COOLDOWN) {
          console.log(`[Routes] Returning cached rugcheck data for ${mint}`);
          const risks = existingResult.risks_json ? JSON.parse(existingResult.risks_json) : [];
          return res.json({
            tokenProgram: existingResult.token_program,
            tokenType: existingResult.token_type,
            risks,
            score: existingResult.risk_score
          });
        }
      }

      // Fetch new data from rugcheck API
      console.log(`[Routes] Fetching fresh rugcheck data for ${mint}`);
      const rugcheckResponse = await axios.get(`${RUGCHECK_API_BASE}/tokens/${mint}/report/summary`);

      const rugcheckData = rugcheckResponse.data;

      // Store the results
      await db.insert(rugcheck_results).values({
        token_address: mint,
        token_program: rugcheckData.tokenProgram,
        token_type: rugcheckData.tokenType,
        risk_score: rugcheckData.score,
        risks_json: JSON.stringify(rugcheckData.risks),
        last_checked_at: now
      }).onConflictDoUpdate({
        target: rugcheck_results.token_address,
        set: {
          token_program: rugcheckData.tokenProgram,
          token_type: rugcheckData.tokenType,
          risk_score: rugcheckData.score,
          risks_json: JSON.stringify(rugcheckData.risks),
          last_checked_at: now
        }
      });

      res.json(rugcheckData);

    } catch (error: any) {
      console.error('[Routes] Rugcheck error:', error);
      res.status(500).json({
        error: 'Failed to fetch rugcheck data',
        details: error.message,
        tokenAddress: req.params.mint
      });
    }
  });

  // Basic token analytics endpoint
  app.get('/api/token-analytics/:mint', async (req, res) => {
    try {
      const { mint } = req.params;
      console.log(`[Routes] Getting analytics for token ${mint}`);

      // Get token metadata and info
      const tokenInfoResponse = await axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'token-info',
        method: 'getToken',
        params: [mint]
      });

      // Process token information
      const tokenInfo = tokenInfoResponse.data.result;
      const supply = tokenInfo.supply || 0;
      const decimals = tokenInfo.decimals || 0;
      const mintAuthority = tokenInfo.mintAuthority;
      const freezeAuthority = tokenInfo.freezeAuthority;

      console.log('[Routes] Analytics response:', {
        supply,
        decimals,
        mintAuthority: mintAuthority || 'None',
        freezeAuthority: freezeAuthority || 'None'
      });

      res.json({
        token: {
          address: mint,
          name: tokenInfo.name || 'Unknown',
          symbol: tokenInfo.symbol || 'Unknown',
          decimals,
          totalSupply: supply,
          mintAuthority,
          freezeAuthority
        }
      });

    } catch (error: any) {
      console.error('[Routes] Token analytics error:', error);
      res.status(500).json({
        error: 'Failed to fetch token analytics',
        details: error.message,
        tokenAddress: req.params.mint
      });
    }
  });

  return httpServer;
}

// Keep existing helper functions
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