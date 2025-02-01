import React, { FC, useState, useCallback, Suspense, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Filter, ArrowLeft } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import TokenChart from "@/components/TokenChart";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TokenCard from "@/components/TokenCard";
import MarketStats from "@/components/MarketStats";
import SocialMetrics from "@/components/SocialMetrics";
import TradingChart from "@/components/TradingChart";
import TradeHistory from "@/components/TradeHistory";
import TradingForm from "@/components/TradingForm";
import HolderAnalytics from "@/components/HolderAnalytics";

const PumpFunVision: FC = () => {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const tokens = usePumpPortalStore(state => state.tokens);
  const isConnected = usePumpPortalStore(state => state.isConnected);
  const setActiveTokenView = usePumpPortalStore(state => state.setActiveTokenView);

  const handleTokenSelect = useCallback((address: string) => {
    console.log('Token selected:', address);
    setSelectedToken(address);
    setActiveTokenView(address);
  }, [setActiveTokenView]);

  const handleBack = useCallback(() => {
    setSelectedToken(null);
    setActiveTokenView(null);
  }, [setActiveTokenView]);

  // Filter tokens based on their stage
  const newTokens = tokens.filter(t => t.isNew);
  const aboutToGraduate = tokens.filter(t => !t.isNew && t.marketCapSol && t.marketCapSol < 100);
  const graduated = tokens.filter(t => !t.isNew && t.marketCapSol && t.marketCapSol >= 100);

  // Loading state
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
          <div className="min-h-screen bg-[#070510] text-white">
            <div className="container mx-auto px-4">
              <div className="flex items-center mb-4">
                <Button variant="ghost" onClick={handleBack} className="text-purple-400">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
              <div className="grid grid-cols-12 gap-4">
                {/* Left sidebar - Market Stats & Social Metrics */}
                <div className="col-span-2 space-y-4">
                  <MarketStats tokenAddress={selectedToken} />
                  <SocialMetrics tokenAddress={selectedToken} />
                </div>

                {/* Main content - Chart & Trade History */}
                <div className="col-span-7 space-y-4">
                  <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4">
                    <TradingChart tokenAddress={selectedToken} />
                  </div>
                  <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
                    <TradeHistory tokenAddress={selectedToken} />
                  </div>
                </div>

                {/* Right sidebar - Trading Form & Analytics */}
                <div className="col-span-3 space-y-4">
                  <TradingForm tokenAddress={selectedToken} />
                  <HolderAnalytics tokenAddress={selectedToken} />
                </div>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1800px] mx-auto p-4">
        <div className="grid grid-cols-3 gap-4">
          {/* New Tokens Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-purple-200">New Creations</h2>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filter
              </Button>
            </div>
            <div className="token-column space-y-3 max-h-[80vh] overflow-y-auto pr-2">
              {newTokens.map((token) => (
                <TokenCard
                  key={token.address}
                  token={token}
                  onClick={() => handleTokenSelect(token.address)}
                />
              ))}
            </div>
          </div>

          {/* About to Graduate Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-purple-200">About to Graduate</h2>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filter
              </Button>
            </div>
            <div className="token-column space-y-3 max-h-[80vh] overflow-y-auto pr-2">
              {aboutToGraduate.map((token) => (
                <TokenCard
                  key={token.address}
                  token={token}
                  onClick={() => handleTokenSelect(token.address)}
                />
              ))}
            </div>
          </div>

          {/* Graduated Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-purple-200">Graduated</h2>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filter
              </Button>
            </div>
            <div className="token-column space-y-3 max-h-[80vh] overflow-y-auto pr-2">
              {graduated.map((token) => (
                <TokenCard
                  key={token.address}
                  token={token}
                  onClick={() => handleTokenSelect(token.address)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PumpFunVision;