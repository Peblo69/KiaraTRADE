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
    const response = await axios.get(`https://api.rugcheck.xyz/v1/tokens/${tokenMint}/report`, {
      timeout: 10000
    });

    if (!response.data) {
      console.log("No response received from RugCheck API");
      return null;
    }

    const tokenReport = response.data;

    const tokenData: TokenData = {
      tokenMint,
      tokenName: tokenReport.tokenMeta?.name || "N/A",
      tokenSymbol: tokenReport.tokenMeta?.symbol || "N/A",
      supply: tokenReport.token?.supply || "N/A",
      decimals: tokenReport.token?.decimals || "N/A",
      mintAuthority: tokenReport.token?.mintAuthority || "N/A",
      freezeAuthority: tokenReport.token?.freezeAuthority || "N/A",
      isInitialized: tokenReport.token?.isInitialized || false,
      mutable: tokenReport.tokenMeta?.mutable || false,
      rugged: tokenReport.rugged || false,
      rugScore: tokenReport.score || 0,
      topHolders: tokenReport.topHolders || [],
      markets: tokenReport.markets || [],
      totalLPProviders: tokenReport.totalLPProviders || 0,
      totalMarketLiquidity: tokenReport.totalMarketLiquidity || 0,
      risks: tokenReport.risks || [],
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