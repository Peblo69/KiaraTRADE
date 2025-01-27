import React, { FC, useState, useEffect, useCallback, Suspense, useMemo } from "react";
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

const SORT_FUNCTIONS = {
  volume: (a: any, b: any) => {
    const volumeA = a.recentTrades?.reduce((acc: number, trade: any) => acc + trade.solAmount, 0) || 0;
    const volumeB = b.recentTrades?.reduce((acc: number, trade: any) => acc + trade.solAmount, 0) || 0;
    return volumeB - volumeA;
  },
  liquidity: (a: any, b: any) => (b.vSolInBondingCurve || 0) - (a.vSolInBondingCurve || 0),
  newest: (a: any, b: any) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  }
};

interface TokenRowProps {
  token: any;
  onClick: () => void;
}

const TokenCard = React.memo<TokenRowProps>(({ token, onClick }) => {
  const priceChange = useMemo(() => {
    if (!token.recentTrades?.length) return { value: 0, isPositive: false };

    const current = token.priceInUsd;
    const previous = token.recentTrades[token.recentTrades.length - 2]?.priceInUsd;
    if (!previous) return { value: 0, isPositive: false };

    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change >= 0
    };
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
            <div className="font-medium">
              ${token.recentTrades?.reduce((acc: number, trade: any) => 
                acc + (trade.solAmount * token.solPrice), 0)?.toFixed(2) || '0.00'}
            </div>
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
});

TokenCard.displayName = 'TokenCard';

const TokenList: FC<{
  tokens: any[];
  onTokenSelect: (address: string) => void;
  sortBy: 'newest' | 'volume' | 'liquidity';
  setSortBy: (sort: 'newest' | 'volume' | 'liquidity') => void;
}> = React.memo(({ tokens, onTokenSelect, sortBy, setSortBy }) => {
  debugLog('TokenList', 'render', { tokenCount: tokens.length });

  const sortedTokens = useMemo(() => {
    return [...tokens].sort(SORT_FUNCTIONS[sortBy]);
  }, [tokens, sortBy]);

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTokens.map((token) => (
            <TokenCard
              key={token.address}
              token={token}
              onClick={() => onTokenSelect(token.address)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

TokenList.displayName = 'TokenList';

const TokenView: FC<{
  address: string;
  onBack: () => void;
}> = React.memo(({ address, onBack }) => {
  debugLog('TokenView', 'render', { address });

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    }>
      <ErrorBoundary>
        <TokenChart 
          tokenAddress={address} 
          onBack={onBack}
        />
      </ErrorBoundary>
    </Suspense>
  );
});

TokenView.displayName = 'TokenView';

const PumpFunVision: FC = () => {
  debugLog('PumpFunVision', 'render start');

  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'volume' | 'liquidity'>('newest');

  // Memoized selectors
  const tokens = usePumpPortalStore(
    useCallback((state) => state.tokens, [])
  );

  const isConnected = usePumpPortalStore(
    useCallback(state => state.isConnected, [])
  );

  const setActiveTokenView = usePumpPortalStore(
    useCallback(state => state.setActiveTokenView, [])
  );

  const addToViewedTokens = usePumpPortalStore(
    useCallback(state => state.addToViewedTokens, [])
  );

  // Handlers
  const handleTokenSelect = useCallback((address: string) => {
    debugLog('PumpFunVision', 'token select', { address });
    setSelectedToken(address);
    setActiveTokenView(address);
    addToViewedTokens(address);
  }, [setActiveTokenView, addToViewedTokens]);

  const handleBack = useCallback(() => {
    debugLog('PumpFunVision', 'back');
    setSelectedToken(null);
    setActiveTokenView(null);
  }, [setActiveTokenView]);

  // Cleanup
  useEffect(() => {
    return () => {
      debugLog('PumpFunVision', 'cleanup');
      setActiveTokenView(null);
    };
  }, [setActiveTokenView]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (selectedToken) {
    return (
      <TokenView
        address={selectedToken}
        onBack={handleBack}
      />
    );
  }

  return (
    <TokenList
      tokens={tokens}
      onTokenSelect={handleTokenSelect}
      sortBy={sortBy}
      setSortBy={setSortBy}
    />
  );
};

export default function PumpFunVisionWrapper() {
  return (
    <ErrorBoundary>
      <PumpFunVision />
    </ErrorBoundary>
  );
}