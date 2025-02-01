import React, { FC, useState, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Filter, ArrowLeft } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import TokenCard from "@/components/TokenCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Import Trading View components with correct relative paths
import MarketStats from "../../../TradingView/project/src/components/MarketStats";
import SocialMetrics from "../../../TradingView/project/src/components/SocialMetrics";
import TradingChart from "../../../TradingView/project/src/components/TradingChart";
import TradeHistory from "../../../TradingView/project/src/components/TradeHistory";
import TradingForm from "../../../TradingView/project/src/components/TradingForm";
import HolderAnalytics from "../../../TradingView/project/src/components/HolderAnalytics";

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
          <div className="min-h-screen bg-[#0A0A0A] text-white">
            <div className="max-w-[1400px] mx-auto p-6">
              {/* Top Navigation */}
              <div className="flex items-center justify-between mb-8 bg-[#111111] p-4 rounded-xl border border-purple-500/20">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="hover:bg-purple-500/20 transition-all duration-300"
                  >
                    <ArrowLeft className="h-5 w-5 text-purple-400" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                      {tokens.find(t => t.address === selectedToken)?.symbol}
                    </h1>
                    <p className="text-sm text-gray-400">
                      ${tokens.find(t => t.address === selectedToken)?.priceInUsd?.toFixed(8) || '0.00000000'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-[1fr_350px] gap-6">
                {/* Chart Section */}
                <div className="space-y-6">
                  <div className="bg-[#111111] rounded-xl border border-purple-500/20 p-6">
                    <MarketStats tokenAddress={selectedToken} />
                  </div>

                  <div className="bg-[#111111] rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-200">Price Chart</h2>
                        <p className="text-sm text-gray-400">Real-time market data</p>
                      </div>
                    </div>
                    <TradingChart tokenAddress={selectedToken} />
                  </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                  {/* Trade History Card */}
                  <div className="bg-[#111111] rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
                    <TradeHistory tokenAddress={selectedToken} />
                  </div>

                  {/* Trading Form */}
                  <div className="bg-[#111111] rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
                    <TradingForm tokenAddress={selectedToken} />
                  </div>

                  {/* Holder Analytics */}
                  <div className="bg-[#111111] rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-all duration-300">
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
              <div className="token-column space-y-3 max-h-[80vh] overflow-y-auto pr-2">
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