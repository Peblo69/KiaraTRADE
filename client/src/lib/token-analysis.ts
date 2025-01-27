import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

// Schema matching our backend response
const tokenAnalyticsSchema = z.object({
  token: z.object({
    address: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.number().optional(),
    supply: z.number().optional(),
    mintAuthority: z.boolean().optional(),
    freezeAuthority: z.boolean().optional(),
    mutable: z.boolean().optional(),
    created: z.number().optional()
  }).optional(),
  holders: z.object({
    total: z.number(),
    unique: z.number().optional(),
    concentration: z.object({
      top10Percentage: z.number().optional(),
      riskLevel: z.enum(['low', 'medium', 'high']).optional()
    }).optional()
  }).optional(),
  snipers: z.object({
    total: z.number(),
    volume: z.number().optional(),
    averageAmount: z.number().optional()
  }).optional(),
  risks: z.array(z.object({
    name: z.string(),
    score: z.number()
  }))
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

export function useTokenAnalysis(tokenAddress: string) {
  return useQuery({
    queryKey: ["tokenAnalysis", tokenAddress],
    queryFn: () => analyzeToken(tokenAddress),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
}