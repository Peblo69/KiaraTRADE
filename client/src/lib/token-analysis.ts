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
  // Check cache first
  const cached = analysisCache.get(tokenMint);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Use our server endpoint instead of direct RugCheck API call
    const response = await axios.get(`/api/token-analytics/${tokenMint}`, {
      timeout: 10000
    });

    if (!response.data) {
      console.log("No response received from token analytics API");
      return null;
    }

    const analytics = response.data;

    // Map server response to TokenData interface
    const tokenData: TokenData = {
      tokenMint,
      tokenName: analytics.token?.name || "Unknown",
      tokenSymbol: analytics.token?.symbol || "Unknown",
      supply: analytics.token?.totalSupply?.toString() || "0",
      decimals: analytics.token?.decimals?.toString() || "0",
      mintAuthority: analytics.token?.mintAuthority || "N/A",
      freezeAuthority: analytics.token?.freezeAuthority || "N/A",
      isInitialized: true,
      mutable: true,
      rugged: false,
      rugScore: analytics.risk?.score || 0,
      topHolders: analytics.holders?.top10?.map(holder => ({
        address: holder.address,
        pct: holder.percentage || 0
      })) || [],
      markets: analytics.trading ? [{
        market: 'JUP',
        liquidityA: analytics.trading.volume24h?.toString() || "0",
        liquidityB: "0"
      }] : [],
      totalLPProviders: analytics.holders?.total || 0,
      totalMarketLiquidity: analytics.trading?.volume24h || 0,
      risks: analytics.risk?.risks?.map(risk => ({
        name: risk.type,
        score: risk.score || 0
      })) || []
    };

    // Cache the results
    analysisCache.set(tokenMint, {
      data: tokenData,
      timestamp: now,
    });

    return tokenData;
  } catch (error) {
    console.error("Token analysis failed:", error);
    return null;
  }
}