import { Token, TokenTrade, TokenSupplyMetrics } from "@/types/token";

export class TokenSupplyTracker {
  private supplyCache: Map<string, TokenSupplyMetrics> = new Map();

  calculateInitialSupply(token: Token): TokenSupplyMetrics {
    // Default to 1 billion if not specified (typical for Solana tokens)
    const TOTAL_SUPPLY = 1_000_000_000;
    
    return {
      totalSupply: TOTAL_SUPPLY,
      circulatingSupply: TOTAL_SUPPLY - (token.vTokensInBondingCurve || 0),
      liquidityTokens: token.vTokensInBondingCurve || 0,
      burnedTokens: 0,
      lockedTokens: token.vTokensInBondingCurve || 0 // Initially, only liquidity tokens are locked
    };
  }

  updateSupplyMetrics(token: Token, trade: TokenTrade): TokenSupplyMetrics {
    const currentMetrics = this.supplyCache.get(token.address) || 
                          this.calculateInitialSupply(token);

    // Update metrics based on trade
    const updatedMetrics = {
      ...currentMetrics,
      liquidityTokens: trade.vTokensInBondingCurve || currentMetrics.liquidityTokens,
      circulatingSupply: currentMetrics.totalSupply - 
                        (trade.vTokensInBondingCurve || currentMetrics.liquidityTokens) - 
                        currentMetrics.burnedTokens
    };

    this.supplyCache.set(token.address, updatedMetrics);
    return updatedMetrics;
  }

  getSupplyMetrics(token: Token): TokenSupplyMetrics | undefined {
    return this.supplyCache.get(token.address);
  }
}

export const supplyTracker = new TokenSupplyTracker();
