import { FC, useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import TokenChart from "@/components/TokenChart";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";

// Debug helper
const DEBUG = true;
function debugLog(component: string, action: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG][${component}][${action}]`, data || '');
  }
}

interface TokenRowProps {
  token: any;
  onClick: () => void;
}

const TokenCard: FC<TokenRowProps> = ({ token, onClick }) => {
  debugLog('TokenCard', 'render', { tokenAddress: token.address });

  const priceChange = useMemo(() => {
    debugLog('TokenCard', 'calculating price change', { trades: token.recentTrades?.length });
    if (token.recentTrades && token.recentTrades.length > 1) {
      const current = token.priceInUsd;
      const previous = token.recentTrades[token.recentTrades.length - 2].priceInUsd;
      const change = ((current - previous) / previous) * 100;
      return {
        value: Math.abs(change),
        isPositive: change >= 0
      };
    }
    return { value: 0, isPositive: false };
  }, [token.priceInUsd, token.recentTrades]);

  return (
    <Card 
      className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={token.imageLink || 'https://via.placeholder.com/150'}
              alt={`${token.symbol} logo`}
              className="w-10 h-10 rounded-full object-cover bg-purple-500/20"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
              }}
            />
            <div>
              <div className="font-medium group-hover:text-purple-400 transition-colors flex items-center gap-2">
                {token.symbol}
                <Badge variant={token.isNew ? "default" : "outline"} className="h-5">
                  {token.isNew ? "New" : "Listed"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {token.name}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1 ${
            priceChange.isPositive ? 'text-green-500' : 'text-red-500'
          }`}>
            {priceChange.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {priceChange.value.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Price</div>
            <div className="font-medium">${token.priceInUsd?.toFixed(8) || '0.00'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Market Cap</div>
            <div className="font-medium">${(token.marketCapSol * token.solPrice)?.toFixed(2) || '0.00'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Liquidity</div>
            <div className="font-medium">${(token.vSolInBondingCurve * token.solPrice)?.toFixed(2) || '0.00'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Volume</div>
            <div className="font-medium">${token.recentTrades?.reduce((acc, trade) => acc + (trade.solAmount * token.solPrice), 0)?.toFixed(2) || '0.00'}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>24h Trades: {token.recentTrades?.length || 0}</span>
            </div>
            <div className="text-muted-foreground">
              Created: {token.createdAt ? new Date(token.createdAt).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Main token list content
const TokenListContent: FC = () => {
  debugLog('TokenListContent', 'render start');

  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'volume' | 'liquidity'>('newest');

  // Memoized selectors with debug
  const tokens = usePumpPortalStore(
    useCallback((state) => {
      debugLog('TokenListContent', 'tokens selector', { 
        tokenCount: state.tokens.length,
        sortBy 
      });

      return [...state.tokens].sort((a, b) => {
        switch (sortBy) {
          case 'volume':
            const volumeA = a.recentTrades?.reduce((acc, trade) => acc + trade.solAmount, 0) || 0;
            const volumeB = b.recentTrades?.reduce((acc, trade) => acc + trade.solAmount, 0) || 0;
            return volumeB - volumeA;
          case 'liquidity':
            return (b.vSolInBondingCurve || 0) - (a.vSolInBondingCurve || 0);
          case 'newest':
          default:
            return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - 
                   (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        }
      });
    }, [sortBy])
  );

  const isConnected = usePumpPortalStore(
    useCallback(state => {
      debugLog('TokenListContent', 'connection check', { isConnected: state.isConnected });
      return state.isConnected;
    }, [])
  );

  const lastUpdate = usePumpPortalStore(
    useCallback(state => {
      debugLog('TokenListContent', 'last update check', { lastUpdate: state.lastUpdate });
      return state.lastUpdate;
    }, [])
  );

  const addToViewedTokens = usePumpPortalStore(
    useCallback(state => state.addToViewedTokens, [])
  );

  const setActiveTokenView = usePumpPortalStore(
    useCallback(state => state.setActiveTokenView, [])
  );
  const getToken = usePumpPortalStore(useCallback(state => state.getToken, []));

  // Handle token selection with debug
  const handleTokenSelect = useCallback((address: string) => {
    debugLog('TokenListContent', 'token select', { address });
    setSelectedToken(address);
    setActiveTokenView(address);
    addToViewedTokens(address);
  }, [addToViewedTokens, setActiveTokenView]);

  // Handle back navigation with debug
  const handleBack = useCallback(() => {
    debugLog('TokenListContent', 'navigation back');
    setSelectedToken(null);
    setActiveTokenView(null);
  }, [setActiveTokenView]);

  useEffect(() => {
    debugLog('TokenListContent', 'connection monitor effect', {
      isConnected,
      lastUpdate
    });

    if (!isConnected) return;

    const healthCheck = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdate > 30000) {
        console.warn('[PumpFunVision] Connection stale, refreshing...');
        window.location.reload();
      }
    }, 10000);

    return () => {
      debugLog('TokenListContent', 'cleanup connection monitor');
      clearInterval(healthCheck);
    };
  }, [isConnected, lastUpdate]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      debugLog('TokenListContent', 'unmount cleanup');
      setSelectedToken(null);
      setActiveTokenView(null);
    };
  }, [setActiveTokenView]);

  if (selectedToken) {
    debugLog('TokenListContent', 'rendering token view', { selectedToken });
    const token = getToken(selectedToken);
    if (!token) {
      console.error('[PumpFunVision] Selected token not found:', selectedToken);
      handleBack();
      return null;
    }
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }>
        <ErrorBoundary>
          <TokenChart 
            tokenAddress={selectedToken} 
            onBack={handleBack}
          />
        </ErrorBoundary>
      </Suspense>
    );
  }

  debugLog('TokenListContent', 'render token list', { 
    tokenCount: tokens.length,
    sortBy,
    isConnected 
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">PumpFun Vision</h1>
            <p className="text-sm text-muted-foreground">
              Track newly created tokens and their performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={sortBy === 'newest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('newest')}
            >
              Newest
            </Button>
            <Button
              variant={sortBy === 'volume' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('volume')}
            >
              Volume
            </Button>
            <Button
              variant={sortBy === 'liquidity' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('liquidity')}
            >
              Liquidity
            </Button>
          </div>
        </div>

        {!isConnected ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : tokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token) => (
              <TokenCard
                key={token.address}
                token={token}
                onClick={() => handleTokenSelect(token.address)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">Waiting for new tokens...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrap with error boundary and add debug logging
const PumpFunVision: FC = () => {
  debugLog('PumpFunVision', 'render');
  return (
    <ErrorBoundary>
      <TokenListContent />
    </ErrorBoundary>
  );
};

export default PumpFunVision;