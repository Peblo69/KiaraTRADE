import { z } from 'zod';

const TokenRiskSchema = z.object({
  name: z.string(),
  description: z.string(),
  level: z.enum(['low', 'medium', 'high']),
  score: z.number().min(0).max(100),
});

const TokenAnalysisSchema = z.object({
  basic: z.object({
    name: z.string(),
    symbol: z.string(),
    totalSupply: z.number(),
    createdAt: z.number(),
  }),
  control: z.object({
    mintAuthorityEnabled: z.boolean(),
    freezeAuthorityEnabled: z.boolean(),
    isImmutable: z.boolean(),
  }),
  holders: z.object({
    topHolders: z.array(z.object({
      address: z.string(),
      balance: z.number(),
      percentage: z.number(),
      isInsider: z.boolean(),
    })),
    concentration: z.number(),
  }),
  market: z.object({
    liquidityUSD: z.number(),
    activeMarkets: z.number(),
    liquidityProviders: z.number(),
  }),
  risks: z.array(TokenRiskSchema),
  overallScore: z.number().min(0).max(100),
});

export type TokenAnalysisData = z.infer<typeof TokenAnalysisSchema>;
export type TokenRisk = z.infer<typeof TokenRiskSchema>;

// Cache analyzed tokens to reduce API calls
const analysisCache = new Map<string, { data: TokenAnalysisData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function analyzeToken(address: string): Promise<TokenAnalysisData> {
  // Check cache first
  const cached = analysisCache.get(address);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(`/api/token/analyze/${address}`);
    
    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    const validated = TokenAnalysisSchema.parse(data);

    // Cache the results
    analysisCache.set(address, {
      data: validated,
      timestamp: now,
    });

    return validated;
  } catch (error) {
    console.error('Token analysis failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze token');
  }
}
