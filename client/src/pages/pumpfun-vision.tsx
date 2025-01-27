import React, { FC, useState, useCallback, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import TokenChart from "@/components/TokenChart";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";

interface TokenRowProps {
  token: any;
  onClick: () => void;
}

const TokenCard = React.memo<TokenRowProps>(({ token, onClick }) => {
  const priceChange = React.useMemo(() => {
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
              <span>Trades: {token.recentTrades?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});

TokenCard.displayName = 'TokenCard';

const PumpFunVision: FC = () => {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'volume' | 'liquidity'>('newest');

  // Global state
  const tokens = usePumpPortalStore(state => state.tokens);
  const isConnected = usePumpPortalStore(state => state.isConnected);
  const setActiveTokenView = usePumpPortalStore(state => state.setActiveTokenView);

  // Handlers
  const handleTokenSelect = useCallback((address: string) => {
    setSelectedToken(address);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedToken(null);
  }, []);

  // Sort tokens
  const sortedTokens = React.useMemo(() => {
    return [...tokens].sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          const volumeA = a.recentTrades?.reduce((acc: number, trade: any) => acc + trade.solAmount, 0) || 0;
          const volumeB = b.recentTrades?.reduce((acc: number, trade: any) => acc + trade.solAmount, 0) || 0;
          return volumeB - volumeA;
        case 'liquidity':
          return (b.vSolInBondingCurve || 0) - (a.vSolInBondingCurve || 0);
        default:
          return 0;
      }
    });
  }, [tokens, sortBy]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (selectedToken) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">PumpFun Vision</h1>
            <p className="text-sm text-muted-foreground">
              Track tokens and their performance
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
              onClick={() => handleTokenSelect(token.address)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PumpFunVision;