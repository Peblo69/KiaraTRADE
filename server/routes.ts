import { db } from "@db";
import { coinImages, coinMappings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { initializePumpPortalWebSocket } from './pumpportal';
import axios from 'axios';
import { format } from 'date-fns';

// Constants and environment checks
const CACHE_DURATION = 30000; // 30 seconds cache
if (!process.env.HELIUS_API_KEY) {
  throw new Error("HELIUS_API_KEY must be set in environment variables");
}

// Update Helius RPC URL with API key
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const JUP_PRICE_URL = 'https://price.jup.ag/v4/price';

// Rate limiting for APIs
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

export function registerRoutes(app: Express): Server {
  const server = createServer(app);

  wsManager.initialize(server);
  initializePumpPortalWebSocket();

  // Token Analytics Endpoint
  app.get('/api/token-analytics/:mint', async (req, res) => {
    try {
      const { mint } = req.params;
      console.log(`\n🔍 Analyzing token: ${mint}`);

      const [rugCheckResponse, heliusResponse] = await Promise.all([
        axios.get(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`, {
          timeout: 5000
        }).catch(() => ({ data: null })),
        axios.post(HELIUS_RPC_URL, {
          jsonrpc: '2.0',
          id: 'token-info',
          method: 'getAsset',
          params: [mint]
        }, {
          timeout: 5000
        }).catch(() => ({ data: { result: null } }))
      ]);

      if (!rugCheckResponse.data) {
        throw new Error('Failed to fetch RugCheck data');
      }

      const token = rugCheckResponse.data;
      const heliusData = heliusResponse.data?.result;

      // Risk Scoring
      const riskFactors = {
        mintAuthority: token.token?.mintAuthority ? 30 : 0,
        freezeAuthority: token.token?.freezeAuthority ? 20 : 0,
        mutable: token.tokenMeta?.mutable ? 10 : 0,
        lowLiquidity: token.totalLPProviders < 3 ? 20 : 0,
        highConcentration: token.topHolders?.[0]?.pct > 50 ? 20 : 0
      };

      const totalRiskScore = Object.values(riskFactors).reduce((a, b) => a + b, 0);

      const analytics = {
        token: {
          address: mint,
          name: token.tokenMeta?.name || 'Unknown',
          symbol: token.tokenMeta?.symbol || 'Unknown',
          decimals: token.token?.decimals || 0,
          totalSupply: Number(token.token?.supply) || 0,
          mintAuthority: token.token?.mintAuthority || null,
          freezeAuthority: token.token?.freezeAuthority || null,
          mutable: token.tokenMeta?.mutable || false,
          created: heliusData?.createdAt || Date.now(),
          supply: Number(token.token?.supply) || 0
        },
        holders: {
          total: token.totalHolders || 0,
          unique: token.uniqueHolders || 0,
          top10: token.topHolders?.slice(0, 10).map((h: any) => ({
            address: h.address,
            balance: h.balance,
            percentage: h.pct
          })) || [],
          concentration: {
            top10Percentage: token.topHolders?.reduce((sum: number, h: any) => sum + h.pct, 0) || 0,
            riskLevel: totalRiskScore > 70 ? 'high' : totalRiskScore > 40 ? 'medium' : 'low'
          },
          distribution: [
            { name: 'Active Wallets', holders: token.totalHolders || 0 }
          ]
        },
        snipers: {
          total: token.snipersCount || 0,
          details: token.snipers || [],
          volume: token.sniperVolume || 0,
          averageAmount: token.sniperVolume ? token.sniperVolume / token.snipersCount : 0
        },
        trading: {
          volume24h: token.volume24h || 0,
          transactions24h: token.txCount24h || 0,
          averageTradeSize: token.averageTradeSize || 0,
          priceImpact: token.priceImpact || 0
        },
        risks: Object.entries(riskFactors).map(([name, score]) => ({
          name,
          score,
        })),
        rugScore: totalRiskScore
      };

      console.log('\n📊 Token Information:');
      console.log('===================');
      console.log(`Name: ${analytics.token.name}`);
      console.log(`Symbol: ${analytics.token.symbol}`);
      console.log(`Supply: ${analytics.token.supply.toLocaleString()}`);
      console.log(`Created: ${format(analytics.token.created, 'yyyy-MM-dd HH:mm:ss')}`);

      if (heliusData?.content?.metadata?.description) {
        console.log('\n📝 Description:');
        console.log('=============');
        console.log(heliusData.content.metadata.description);
      }

      console.log('\n🔐 Security Analysis:');
      console.log('===================');
      console.log(`Mint Authority: ${analytics.token.mintAuthority ? '⚠️ ENABLED' : '✅ DISABLED'}`);
      console.log(`Freeze Authority: ${analytics.token.freezeAuthority ? '⚠️ ENABLED' : '✅ DISABLED'}`);
      console.log(`Metadata Mutable: ${analytics.token.mutable ? '⚠️ YES' : '✅ NO'}`);

      console.log('\n⚠️ Risk Assessment:');
      console.log('=================');
      Object.entries(riskFactors).forEach(([factor, score]) => {
        if (score > 0) {
          console.log(`• ${factor}: ${score} points`);
        }
      });

      const riskLevel = totalRiskScore > 70 ? '🔴 HIGH' : 
                      totalRiskScore > 40 ? '🟡 MEDIUM' : 
                      '🟢 LOW';

      console.log('\n📊 Final Verdict:');
      console.log('===============');
      console.log(`Risk Score: ${totalRiskScore}/100`);
      console.log(`Risk Level: ${riskLevel}`);

      if (token.rugged) {
        console.log('\n🚨 WARNING: TOKEN IS MARKED AS RUGGED 🚨');
      }

      res.json(analytics);
    } catch (error: any) {
      console.error('[Routes] Token analytics error:', error);
      if (error.response) {
        console.error('[Routes] Response error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      res.status(500).json({
        error: 'Failed to fetch token analytics',
        details: error.message
      });
    }
  });

  return server;
}

// Token Analytics Interface
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