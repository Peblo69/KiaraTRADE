import { wsManager } from './websocket';

interface TokenMetrics {
  price: number;          // Current token price
  marketCap: number;      // Market cap calculation
  volume24h: number;      // 24-hour trading volume
  buyCount24h: number;    // Number of buy transactions
  sellCount24h: number;   // Number of sell transactions
  lastUpdate: number;     // Timestamp of last update
}

class TokenMetricsService {
  private metrics: Map<string, TokenMetrics> = new Map();
  private readonly METRICS_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly BROADCAST_INTERVAL = 5000; // Broadcast every 5 seconds

  constructor() {
    // Clean up old metrics data periodically
    setInterval(() => this.cleanupOldMetrics(), this.METRICS_CLEANUP_INTERVAL);

    // Set up periodic broadcasting
    setInterval(() => this.broadcastAllMetrics(), this.BROADCAST_INTERVAL);
  }

  private cleanupOldMetrics() {
    const now = Date.now();
    this.metrics.forEach((metrics, tokenAddress) => {
      if (now - metrics.lastUpdate > this.METRICS_CLEANUP_INTERVAL) {
        console.log(`[TokenMetrics] Cleaning up old metrics for ${tokenAddress}`);
        this.metrics.delete(tokenAddress);
      }
    });
  }

  processTransaction(data: any) {
    try {
      const { tokenAddress, type, amount, baseTokenAmount, quoteTokenAmount } = this.extractTransactionData(data);

      if (!tokenAddress) {
        console.warn('[TokenMetrics] Missing token address in transaction data');
        return;
      }

      // Get or initialize metrics for this token
      let metrics = this.getOrCreateMetrics(tokenAddress);

      // Update transaction counts
      if (type === 'buy') {
        metrics.buyCount24h++;
      } else if (type === 'sell') {
        metrics.sellCount24h++;
      }

      // Update volume
      if (amount > 0) {
        metrics.volume24h += amount;
      }

      // Calculate price from liquidity pool data
      if (baseTokenAmount > 0 && quoteTokenAmount > 0) {
        metrics.price = baseTokenAmount / quoteTokenAmount;
        // Assuming fixed supply of 1 billion for market cap calculation
        metrics.marketCap = metrics.price * 1_000_000_000;
      }

      metrics.lastUpdate = Date.now();
      this.metrics.set(tokenAddress, metrics);

      // Broadcast updated metrics immediately for this token
      this.broadcastMetrics(tokenAddress, metrics);

      console.log(`[TokenMetrics] Updated metrics for ${tokenAddress}:`, {
        price: metrics.price,
        marketCap: metrics.marketCap,
        volume24h: metrics.volume24h,
        buys: metrics.buyCount24h,
        sells: metrics.sellCount24h
      });

    } catch (error) {
      console.error('[TokenMetrics] Error processing transaction:', error);
    }
  }

  private extractTransactionData(data: any) {
    // Extract relevant data from Helius transaction data
    const tokenAddress = data.mint || data.tokenAddress;
    const type = this.determineTransactionType(data);
    const amount = parseFloat(data.amount) || 0;
    const baseTokenAmount = parseFloat(data.baseTokenAmount) || 0;
    const quoteTokenAmount = parseFloat(data.quoteTokenAmount) || 0;

    return { tokenAddress, type, amount, baseTokenAmount, quoteTokenAmount };
  }

  private determineTransactionType(data: any): 'buy' | 'sell' | 'unknown' {
    const { source, destination } = data;

    // Check if destination is a known liquidity pool
    if (this.isLiquidityPool(destination)) {
      return 'buy';
    }

    // Check if source is a known liquidity pool
    if (this.isLiquidityPool(source)) {
      return 'sell';
    }

    return 'unknown';
  }

  private isLiquidityPool(address: string): boolean {
    // Add logic to identify liquidity pool addresses
    // This is a placeholder - implement actual LP detection logic
    return address?.toLowerCase().includes('pool') || 
           address?.toLowerCase().includes('amm') ||
           address?.toLowerCase().includes('swap');
  }

  private getOrCreateMetrics(tokenAddress: string): TokenMetrics {
    const existing = this.metrics.get(tokenAddress);
    if (existing) {
      return existing;
    }

    return {
      price: 0,
      marketCap: 0,
      volume24h: 0,
      buyCount24h: 0,
      sellCount24h: 0,
      lastUpdate: Date.now()
    };
  }

  private broadcastMetrics(tokenAddress: string, metrics: TokenMetrics) {
    wsManager.broadcast({
      type: 'token_metrics_update',
      data: {
        tokenAddress,
        price: metrics.price,
        marketCap: metrics.marketCap,
        volume24h: metrics.volume24h,
        buyCount24h: metrics.buyCount24h,
        sellCount24h: metrics.sellCount24h,
        timestamp: Date.now()
      }
    });
  }

  private broadcastAllMetrics() {
    // Create a batch update of all active tokens
    const updates = Array.from(this.metrics.entries()).map(([address, metrics]) => ({
      tokenAddress: address,
      price: metrics.price,
      marketCap: metrics.marketCap,
      volume24h: metrics.volume24h,
      buyCount24h: metrics.buyCount24h,
      sellCount24h: metrics.sellCount24h,
      timestamp: Date.now()
    }));

    if (updates.length > 0) {
      wsManager.broadcast({
        type: 'token_metrics_batch_update',
        data: updates
      });
      console.log(`[TokenMetrics] Broadcasting batch update for ${updates.length} tokens`);
    }
  }

  // Public methods to access metrics
  getTokenMetrics(tokenAddress: string): TokenMetrics | null {
    return this.metrics.get(tokenAddress) || null;
  }

  getAllMetrics(): Record<string, TokenMetrics> {
    return Object.fromEntries(this.metrics.entries());
  }
}

export const tokenMetricsService = new TokenMetricsService();