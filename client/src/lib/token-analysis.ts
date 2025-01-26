import axios from 'axios';

interface TokenData {
  tokenMint: string;
  tokenName: string; 
  tokenSymbol: string;
  supply: string;
  decimals: string;
  mintAuthority: string;
  freezeAuthority: string;
  isInitialized: boolean;
  mutable: boolean;
  rugged: boolean;
  rugScore: number;
  topHolders: Array<{
    address: string;
    pct: number;
  }>;
  markets: Array<{
    market: string;
    liquidityA: string;
    liquidityB: string;
  }>;
  totalLPProviders: number;
  totalMarketLiquidity: number;
  risks: Array<{
    name: string;
    score: number;
  }>;
}

// Cache analyzed tokens to reduce API calls
const analysisCache = new Map<string, { data: TokenData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function analyzeToken(tokenMint: string): Promise<TokenData | null> {
  console.log(`[Token Analysis] Starting analysis for token: ${tokenMint}`);

  // Check cache first
  const cached = analysisCache.get(tokenMint);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log(`[Token Analysis] Returning cached data for ${tokenMint}`);
    return cached.data;
  }

  try {
    console.log(`[Token Analysis] Fetching fresh data for ${tokenMint}`);
    const response = await axios.get(`/api/token-analytics/${tokenMint}`);
    console.log('[Token Analysis] Raw API response:', response.data);

    if (!response.data) {
      console.log("[Token Analysis] No response received from token analytics API");
      return null;
    }

    const analytics = response.data;
    console.log(`[Token Analysis] Processing analytics:`, analytics);

    // Map server response to TokenData interface
    const tokenData: TokenData = {
      tokenMint,
      tokenName: analytics.token?.name || "Unknown",
      tokenSymbol: analytics.token?.symbol || "Unknown",
      supply: analytics.token?.supply?.toString() || "0",
      decimals: analytics.token?.decimals?.toString() || "0",
      mintAuthority: analytics.token?.mintAuthority || "N/A",
      freezeAuthority: analytics.token?.freezeAuthority || "N/A",
      isInitialized: true,
      mutable: analytics.token?.mutable || false,
      rugged: analytics.rugScore > 80,
      rugScore: analytics.rugScore || 0,
      topHolders: analytics.holders?.top10?.map((holder: any) => ({
        address: holder.address,
        pct: holder.percentage || 0
      })) || [],
      markets: analytics.trading?.markets || [],
      totalLPProviders: analytics.holders?.total || 0,
      totalMarketLiquidity: analytics.trading?.volume24h || 0,
      risks: analytics.risks?.map((risk: any) => ({
        name: risk.name,
        score: risk.score || 0
      })) || []
    };

    console.log('[Token Analysis] Processed token data:', tokenData);

    // Cache the results
    analysisCache.set(tokenMint, {
      data: tokenData,
      timestamp: now,
    });

    return tokenData;
  } catch (error) {
    console.error("[Token Analysis] Analysis failed:", error);
    if (axios.isAxiosError(error)) {
      console.error("[Token Analysis] Response:", error.response?.data);
      console.error("[Token Analysis] Status:", error.response?.status);
    }
    return null;
  }
}