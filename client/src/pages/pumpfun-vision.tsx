import React, { FC, useState, useCallback, Suspense, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Filter } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import TokenChart from "@/components/TokenChart";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TokenCard from "@/components/TokenCard";
import { SocialBar } from "@/components/SocialBar";

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

  // Loading state
  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (selectedToken) {
    const token = tokens.find(t => t.address === selectedToken);
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }>
        <ErrorBoundary>
          <div className="flex flex-col min-h-screen">
            <SocialBar selectedToken={token} />
            <TokenChart 
              tokenAddress={selectedToken} 
              onBack={handleBack}
            />
          </div>
        </ErrorBoundary>
      </Suspense>
    );
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

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
            <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2">
              {newTokens.map((token) => (
                <TokenCard
                  key={token.address}
                  token={token}
                  onClick={() => handleTokenSelect(token.address)}
                  onCopyAddress={() => handleCopyAddress(token.address)}
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
            <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2">
              {aboutToGraduate.map((token) => (
                <TokenCard
                  key={token.address}
                  token={token}
                  onClick={() => handleTokenSelect(token.address)}
                  onCopyAddress={() => handleCopyAddress(token.address)}
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
            <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2">
              {graduated.map((token) => (
                <TokenCard
                  key={token.address}
                  token={token}
                  onClick={() => handleTokenSelect(token.address)}
                  onCopyAddress={() => handleCopyAddress(token.address)}
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