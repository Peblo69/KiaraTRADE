import React, { FC, useState, useCallback, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import TokenChart from "@/components/TokenChart";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TokenCard from "@/components/TokenCard";

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