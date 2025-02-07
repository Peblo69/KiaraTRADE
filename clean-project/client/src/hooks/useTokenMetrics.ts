import { useState, useEffect, useCallback, useRef } from 'react';
import { Token, TokenTrade } from '@/types/token';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface TokenMetrics {
  marketCapSol: number;
  volume24h: number;
  topHoldersPercentage: number;
  devWalletPercentage: number;
  insiderPercentage: number;
  snipersCount: number;
  holdersCount: number;
}

interface UseTokenMetricsOptions {
  onMetricsChange?: (metrics: TokenMetrics) => void;
  refreshInterval?: number;
}

export const useTokenMetrics = (
  token: Token,
  options: UseTokenMetricsOptions = {}
) => {
  const {
    onMetricsChange,
    refreshInterval = 60000 // Default to 1 minute
  } = options;

  const [metrics, setMetrics] = useState<TokenMetrics>(() => 
    calculateTokenMetrics(
      token,
      token.recentTrades || [],
      parseInt(token.createdAt || Date.now().toString())
    )
  );

  const prevMetricsRef = useRef<TokenMetrics | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateCurrentMetrics = useCallback(() => {
    return calculateTokenMetrics(
      token,
      token.recentTrades || [],
      parseInt(token.createdAt || Date.now().toString())
    );
  }, [token]);

  // Subscribe to real-time updates
  useEffect(() => {
    const handleTokenUpdate = (updatedToken: Token | undefined) => {
      if (!updatedToken) return;

      const newMetrics = calculateTokenMetrics(
        updatedToken,
        updatedToken.recentTrades || [],
        parseInt(updatedToken.createdAt || Date.now().toString())
      );

      const hasChanged = !prevMetricsRef.current ||
        prevMetricsRef.current.marketCapSol !== newMetrics.marketCapSol ||
        prevMetricsRef.current.volume24h !== newMetrics.volume24h;

      if (hasChanged) {
        setMetrics(newMetrics);
        prevMetricsRef.current = newMetrics;
        onMetricsChange?.(newMetrics);
      }
    };

    const unsubscribe = usePumpPortalStore.subscribe(
      (state) => state.tokens.find(t => t.address === token.address),
      handleTokenUpdate
    );

    // Initial calculation
    handleTokenUpdate(token);

    return () => {
      unsubscribe();
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [token, token.address, onMetricsChange]);

  // Regular refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      const newMetrics = calculateCurrentMetrics();
      setMetrics(newMetrics);
      onMetricsChange?.(newMetrics);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, calculateCurrentMetrics, onMetricsChange]);

  return {
    metrics,
    calculateCurrentMetrics,
    isInitialized: !!prevMetricsRef.current
  };
};

// Helper function to calculate token metrics (pure function)
const calculateTokenMetrics = (
  token: Token,
  trades: TokenTrade[],
  creationTimestamp: number
): TokenMetrics => {
  // Existing calculation logic...
};

export default useTokenMetrics;
