import type { Express } from "express";
import { createServer, type Server } from "http";
import axios from 'axios';

// Update Helius RPC URL with the working API key
const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=004f9b13-f526-4952-9998-52f5c7bec6ee';

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Add token analytics endpoint
  app.get('/api/token-analytics/:mint', async (req, res) => {
    try {
      const { mint } = req.params;
      console.log(`[Routes] Getting token analytics for ${mint}`);

      // Get token metadata using Helius API
      const tokenInfoResponse = await axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'token-info',
        method: 'getToken',
        params: [mint]
      });

      console.log('[DEBUG] Token Info Response:', tokenInfoResponse.data);

      // Extract token information with proper null checks
      const tokenInfo = tokenInfoResponse.data?.result?.token_info || {};
      const metadata = tokenInfoResponse.data?.result?.content?.metadata || {};

      // Build the response object with available data
      const response = {
        token: {
          address: mint,
          supply: tokenInfo.supply || 0,
          decimals: tokenInfo.decimals || 0,
          tokenProgram: tokenInfo.token_program || '',
          interface: tokenInfoResponse.data?.result?.interface || 'Unknown',
          name: metadata.name || 'Unknown',
          symbol: metadata.symbol || 'Unknown'
        }
      };

      console.log('[Routes] Analytics response prepared:', {
        hasTokenInfo: !!tokenInfo.supply,
        hasMetadata: !!metadata.name
      });

      res.json(response);

    } catch (error: any) {
      console.error('[Routes] Token analytics error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      res.status(500).json({
        error: 'Failed to fetch token analytics',
        details: error.message
      });
    }
  });

  return httpServer;
}