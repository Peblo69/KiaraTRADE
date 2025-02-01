import { useState } from 'react';
import { format } from 'date-fns';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { PumpPortalToken } from '@/types/token';

interface TokenAnalysisData {
  tokenInfo: {
    name: string;
    symbol: string;
    supply?: string;
    createdAt: string;
    description?: string;
    lastAnalyzedAt: string;
  };
  market: {
    totalMarkets: number;
    liquidity: number;
    bondingCurve: string;
    tokensInCurve: number;
  };
  trading: {
    recentTrades: number;
    volume24h: number;
    priceChange24h?: number;
  };
  risks: {
    score: number;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    factors: string[];
  };
}

export function useTokenAnalysis(tokenMint: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TokenAnalysisData | null>(null);

  const token = usePumpPortalStore(state => state.getToken(tokenMint));

  const analyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!token) {
        throw new Error('Token not found in PumpPortal');
      }

      // Calculate risk factors
      const riskFactors: string[] = [];
      let riskScore = 0;

      if (token.vSolInBondingCurve < 10) {
        riskFactors.push('Low liquidity');
        riskScore += 33;
      }

      if (token.isNew) {
        riskFactors.push('New token');
        riskScore += 33;
      }

      const analysis: TokenAnalysisData = {
        tokenInfo: {
          name: token.name,
          symbol: token.symbol,
          createdAt: format(Number(token.createdAt) || Date.now(), 'yyyy-MM-dd HH:mm:ss'),
          description: token.metadata?.description,
          lastAnalyzedAt: format(Date.now(), 'yyyy-MM-dd HH:mm:ss'),
        },
        market: {
          totalMarkets: 1, // PumpPortal only has one market per token
          liquidity: token.vSolInBondingCurve || 0,
          bondingCurve: token.bondingCurveKey || 'Unknown',
          tokensInCurve: token.vTokensInBondingCurve || 0
        },
        trading: {
          recentTrades: token.recentTrades?.length || 0,
          volume24h: token.recentTrades?.reduce((sum, trade) => 
            sum + (trade.txType === 'buy' || trade.txType === 'sell' ? trade.solAmount : 0), 0) || 0,
        },
        risks: {
          score: riskScore,
          level: riskScore > 66 ? 'HIGH' : riskScore > 33 ? 'MEDIUM' : 'LOW',
          factors: riskFactors
        }
      };

      setData(analysis);
    } catch (error: any) {
      setError(error.message || 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    analyze,
    isLoading,
    error,
    data
  };
}