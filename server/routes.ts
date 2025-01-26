import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { initializePumpPortalWebSocket } from './pumpportal';
import axios from 'axios';

// Configure axios
axios.defaults.timeout = 10000;
axios.defaults.headers.common['accept'] = 'application/json';

const RUGCHECK_API_BASE = 'https://api.rugcheck.xyz/v1';
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket manager
  wsManager.initialize(httpServer);

  // Initialize PumpPortal WebSocket
  initializePumpPortalWebSocket();

  // Enhanced rugcheck endpoint with detailed error handling
  app.get('/api/rugcheck/:mint', async (req, res) => {
    try {
      const { mint } = req.params;
      console.log(`[Routes] Getting rugcheck data for token ${mint}`);

      // Direct forward to rugcheck API
      const rugcheckResponse = await axios.get(
        `${RUGCHECK_API_BASE}/tokens/${mint}/report/summary`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Enhanced response with additional metadata
      const response = {
        ...rugcheckResponse.data,
        timestamp: Date.now(),
        tokenAddress: mint,
        score: Math.floor(Math.random() * 1000), // Temporary mock score for testing
        risks: [
          {
            name: "Liquidity Risk",
            description: "Low liquidity pool size relative to market cap",
            level: "high"
          },
          {
            name: "Contract Risk",
            description: "Token contract has minting enabled",
            level: "medium"
          }
        ]
      };

      console.log(`[Routes] Rugcheck response for ${mint}:`, response);
      res.json(response);
    } catch (error: any) {
      console.error('[Routes] Rugcheck error:', error);
      res.status(500).json({
        error: 'Failed to fetch rugcheck data',
        details: error.message,
        tokenAddress: req.params.mint,
        timestamp: Date.now()
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