import { FC, useState, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Filter, ArrowLeft } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import TokenCard from "@/components/TokenCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Import Trading View components
import MarketStats from "../../../TradingView/project/src/components/MarketStats";
import SocialMetrics from "../../../TradingView/project/src/components/SocialMetrics";
import TradeHistory from "../../../TradingView/project/src/components/TradeHistory";
import TradingForm from "../../../TradingView/project/src/components/TradingForm";
import HolderAnalytics from "../../../TradingView/project/src/components/HolderAnalytics";

const PumpFunVision: FC = () => {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const tokens = usePumpPortalStore(state => state.tokens);
  const isConnected = usePumpPortalStore(state => state.isConnected);
  const setActiveTokenView = usePumpPortalStore(state => state.setActiveTokenView);

  const handleTokenSelect = useCallback((address: string) => {
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
            <div className="container mx-auto px-4 relative">
              <div className="grid grid-cols-12 gap-4">
                {/* Left Column - Market Stats & Social Metrics */}
                <div className="col-span-2 space-y-4">
                  <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4">
                    <MarketStats tokenAddress={selectedToken} />
                  </div>
                  <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4">
                    <SocialMetrics tokenAddress={selectedToken} />
                  </div>
                </div>

                {/* Main Trading Area */}
                <div className="col-span-7 space-y-4">
                  <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <Button variant="ghost" onClick={handleBack} className="text-purple-400">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <div>
                        <h1 className="text-2xl font-bold text-purple-100">
                          {tokens.find(t => t.address === selectedToken)?.symbol}
                        </h1>
                        <p className="text-sm text-purple-400">
                          ${tokens.find(t => t.address === selectedToken)?.priceInUsd?.toFixed(8) || '0.00000000'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4">
                    <TradeHistory tokenAddress={selectedToken} />
                  </div>
                </div>

                {/* Right Column - Trading Form & Holder Analytics */}
                <div className="col-span-3 space-y-4">
                  <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4">
                    <TradingForm tokenAddress={selectedToken} />
                  </div>
                  <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30 p-4">
                    <HolderAnalytics tokenAddress={selectedToken} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#070510]">
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Tokens Columns */}
          {[
            { title: "New Creations", tokens: newTokens },
            { title: "About to Graduate", tokens: aboutToGraduate },
            { title: "Graduated", tokens: graduated }
          ].map(({ title, tokens }) => (
            <div key={title} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-purple-200">{title}</h2>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </div>
              <div className="token-column space-y-3 max-h-[80vh] overflow-y-auto">
                {tokens.map((token) => (
                  <TokenCard
                    key={token.address}
                    token={token}
                    onClick={() => handleTokenSelect(token.address)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PumpFunVision;