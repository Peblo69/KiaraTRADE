import { db } from "@db";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { initializePumpPortalWebSocket } from './pumpportal';
import { generateAIResponse } from './services/ai';
import axios from 'axios';
import { pricePredictionService } from './services/price-prediction';
import { cryptoService } from './services/crypto';

// Constants
const RUGCHECK_API_BASE = 'https://api.rugcheck.xyz/v1';

// Configure axios
axios.defaults.timeout = 10000;
axios.defaults.headers.common['accept'] = 'application/json';

if (!process.env.HELIUS_API_KEY) {
  throw new Error("HELIUS_API_KEY must be set in environment variables");
}

const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

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

  // Simple rugcheck endpoint
  app.get('/api/rugcheck/:mint', async (req, res) => {
    try {
      const { mint } = req.params;
      console.log(`[Routes] Getting rugcheck data for token ${mint}`);

      // Fetch data directly from rugcheck API
      const rugcheckResponse = await axios.get(`${RUGCHECK_API_BASE}/tokens/${mint}/report/summary`);

      res.json(rugcheckResponse.data);
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