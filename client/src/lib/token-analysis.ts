import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

// Define token security schema to match our working backend implementation
const tokenAnalyticsSchema = z.object({
  token: z.object({
    address: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number(),
    totalSupply: z.number(),
    mintAuthority: z.string().nullable(),
    freezeAuthority: z.string().nullable(),
    mutable: z.boolean(),
    created: z.number(),
    supply: z.number()
  }),
  holders: z.object({
    total: z.number(),
    unique: z.number(),
    top10: z.array(z.object({
      address: z.string(),
      balance: z.number(),
      percentage: z.number()
    })),
    concentration: z.object({
      top10Percentage: z.number(),
      riskLevel: z.enum(['low', 'medium', 'high'])
    }),
    distribution: z.array(z.object({
      name: z.string(),
      holders: z.number()
    }))
  }),
  snipers: z.object({
    total: z.number(),
    details: z.array(z.object({
      address: z.string(),
      amount: z.number(),
      timestamp: z.number()
    })),
    volume: z.number(),
    averageAmount: z.number()
  }),
  trading: z.object({
    volume24h: z.number(),
    transactions24h: z.number(),
    averageTradeSize: z.number(),
    priceImpact: z.number()
  }),
  risks: z.array(z.object({
    name: z.string(),
    score: z.number()
  })),
  rugScore: z.number()
});

export type TokenAnalysis = z.infer<typeof tokenAnalyticsSchema>;

export async function analyzeToken(tokenAddress: string): Promise<TokenAnalysis> {
  try {
    const response = await fetch(`/api/token-analytics/${tokenAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch token analytics: ${response.statusText}`);
    }
    const data = await response.json();
    return tokenAnalyticsSchema.parse(data);
  } catch (error) {
    console.error("[TokenAnalysis] Error fetching token data:", error);
    throw error;
  }
}

// Hook for using token analysis with React Query
export function useTokenAnalysis(tokenAddress: string) {
  return useQuery({
    queryKey: ["tokenAnalysis", tokenAddress],
    queryFn: () => analyzeToken(tokenAddress),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });
}
