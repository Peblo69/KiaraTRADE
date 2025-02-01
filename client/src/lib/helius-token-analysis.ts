import axios from 'axios';
import { create } from 'zustand';
import { useState, useEffect } from 'react';

const HELIUS_API_KEY = '004f9b13-f526-4952-9998-52f5c7bec6ee';
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export interface TokenAnalysisData {
  marketStats: {
    marketCap: number;
    circulatingSupply: number;
    totalSupply: number;
    maxSupply: number;
    priceChange24h: number;
    volume24h: number;
    liquidity24h: number;
    ath: {
      price: number;
      timestamp: number;
    };
    atl: {
      price: number;
      timestamp: number;
    };
  };
  socialMetrics: {
    communityScore: number;
    socialVolume: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    trendingTopics: string[];
  };
}

export async function analyzeToken(tokenAddress: string): Promise<TokenAnalysisData | null> {
  try {
    console.log(`\n🔍 Starting analysis for token: ${tokenAddress}`);

    // Get token details from Helius
    const [assetResponse, transfersResponse] = await Promise.all([
      axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'token-info',
        method: 'getAsset',
        params: [tokenAddress]
      }),
      axios.post(HELIUS_RPC_URL, {
        jsonrpc: '2.0',
        id: 'transfers',
        method: 'getSignaturesForAsset',
        params: {
          assetId: tokenAddress,
          limit: 100,
          sortBy: {
            value: 'blockTime',
            order: 'desc'
          }
        }
      })
    ]);

    const asset = assetResponse.data?.result;
    const transfers = transfersResponse.data?.result || [];

    // Calculate 24h metrics
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const transfersLast24h = transfers.filter((t: any) => t.blockTime * 1000 > oneDayAgo);

    // Calculate volume
    const volume24h = transfersLast24h.reduce((sum: number, t: any) => {
      return sum + (t.nativeTransfers?.[0]?.amount || 0);
    }, 0);

    // Find ATH/ATL
    let ath = { price: 0, timestamp: 0 };
    let atl = { price: Infinity, timestamp: 0 };

    transfers.forEach((t: any) => {
      const price = t.nativeTransfers?.[0]?.amount || 0;
      if (price > ath.price) {
        ath = { price, timestamp: t.blockTime * 1000 };
      }
      if (price < atl.price && price > 0) {
        atl = { price, timestamp: t.blockTime * 1000 };
      }
    });

    // Calculate social metrics
    const recentTrades = transfers.slice(0, 20);
    const buyCount = recentTrades.filter((t: any) => 
      t.nativeTransfers?.[0]?.fromUserAccount === t.source
    ).length;

    const sentiment = buyCount > recentTrades.length * 0.6 ? 'bullish' : 
                     buyCount < recentTrades.length * 0.4 ? 'bearish' : 
                     'neutral';

    // Return analysis data
    return {
      marketStats: {
        marketCap: asset?.marketCap || 0,
        circulatingSupply: asset?.supply?.circulating || 0,
        totalSupply: asset?.supply?.total || 0,
        maxSupply: asset?.supply?.max || 0,
        priceChange24h: calculatePriceChange(transfers),
        volume24h,
        liquidity24h: volume24h * 0.05, // Estimate liquidity as 5% of volume
        ath,
        atl: atl.price === Infinity ? { price: 0, timestamp: 0 } : atl
      },
      socialMetrics: {
        communityScore: Math.min(Math.ceil(transfers.length / 10), 10),
        socialVolume: Math.min(transfers.length, 100),
        sentiment,
        trendingTopics: ['Initial Launch', 'Trading Volume']
      }
    };

  } catch (error) {
    console.error('Error analyzing token:', error);
    return null;
  }
}

function calculatePriceChange(transfers: any[]): number {
  if (transfers.length < 2) return 0;

  const latest = transfers[0].nativeTransfers?.[0]?.amount || 0;
  const past = transfers[transfers.length - 1].nativeTransfers?.[0]?.amount || 0;

  if (past === 0) return 0;
  return ((latest - past) / past) * 100;
}

// Create a store for caching analysis results
interface AnalysisStore {
  cache: Record<string, TokenAnalysisData>;
  setAnalysis: (tokenAddress: string, data: TokenAnalysisData) => void;
  getAnalysis: (tokenAddress: string) => TokenAnalysisData | null;
}

const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  cache: {},
  setAnalysis: (tokenAddress, data) => 
    set(state => ({ cache: { ...state.cache, [tokenAddress]: data } })),
  getAnalysis: (tokenAddress) => get().cache[tokenAddress] || null
}));

// Export the React hook for components
export function useTokenAnalysis(tokenAddress: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TokenAnalysisData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await analyzeToken(tokenAddress);
        if (result) {
          setData(result);
          useAnalysisStore.getState().setAnalysis(tokenAddress, result);
        } else {
          setError('Analysis failed');
        }
      } catch (error: any) {
        setError(error.message || 'Analysis failed');
      } finally {
        setIsLoading(false);
      }
    };

    // Try to get cached data first
    const cachedData = useAnalysisStore.getState().getAnalysis(tokenAddress);
    if (cachedData) {
      setData(cachedData);
    }

    fetchData();
  }, [tokenAddress]);

  return { data, isLoading, error };
}