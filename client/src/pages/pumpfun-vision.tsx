import { FC, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import millify from "millify";

import {
  usePumpPortalStore,
  PumpPortalToken,
} from "@/lib/pump-portal-websocket";

const PumpFunVision: FC = () => {
  // ----- Zustand state -----
  const tokens = usePumpPortalStore((state) => state.tokens);
  const isConnected = usePumpPortalStore((state) => state.isConnected);
  const solPrice = usePumpPortalStore((state) => state.solPrice);

  const { toast } = useToast();

  // ----- Debug logs -----
  useEffect(() => {
    console.log("[PumpFunVision] isConnected:", isConnected);
    console.log("[PumpFunVision] solPrice:", solPrice);
    console.log("[PumpFunVision] tokens:", tokens);
  }, [isConnected, solPrice, tokens]);

  // ----- Time difference helper -----
  const getTimeDiff = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    return `${seconds}s ago`;
  };

  // Format numbers with millify
  const formatNumber = (value: number | string) => {
    if (typeof value === "string") {
      const num = parseFloat(value);
      if (isNaN(num)) return "N/A";
      value = num;
    }
    if (value === 0 || !value) return "N/A";
    return `$${millify(value, {
      precision: 2,
      lowercase: true
    })}`;
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="w-full max-w-[1200px] mx-auto p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 text-green-400">
            <span className="text-sm">🔥 New Pairs</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Find the latest tokens across chains
          </span>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr] gap-4 px-4 py-2 text-xs text-muted-foreground">
          <div>Token</div>
          <div className="text-right">Created</div>
          <div className="text-right">Liquidity</div>
          <div className="text-right">L1 Liquidity</div>
          <div className="text-right">MarketCap</div>
          <div className="text-right">Swaps</div>
          <div className="text-right">Quick Buy</div>
        </div>

        {/* Token Rows */}
        <div className="space-y-1">
          {!isConnected ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : tokens.length > 0 ? (
            tokens.map((token: PumpPortalToken) => (
              <Card
                key={`${token.symbol}-${token.timestamp}`}
                className="hover:bg-accent/5 transition-all duration-300 cursor-pointer"
              >
                <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr] gap-4 px-4 py-3 items-center">
                  {/* Token Symbol/Name */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      {token.symbol ? token.symbol[0] : "?"}
                    </div>
                    <div>
                      <div className="font-medium">
                        {token.symbol || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {token.name || "Unknown Name"}
                      </div>
                    </div>
                  </div>

                  {/* Created (time diff) */}
                  <div className="text-right font-mono text-muted-foreground">
                    {token.timestamp ? getTimeDiff(token.timestamp) : "N/A"}
                  </div>

                  {/* Liquidity */}
                  <div className="text-right font-mono">
                    {formatNumber(token.liquidity)}
                  </div>

                  {/* L1 Liquidity */}
                  <div className="text-right font-mono">
                    {formatNumber(token.l1Liquidity)}
                  </div>

                  {/* MarketCap */}
                  <div className="text-right font-mono">
                    {formatNumber(token.marketCap)}
                  </div>

                  {/* Swaps */}
                  <div className="text-right font-mono">{token.swaps || 0}</div>

                  {/* Quick Buy */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      toast({
                        title: "Quick Buy",
                        description: `Clicked Quick Buy for ${token.symbol}`,
                      });
                      // Insert your buy logic here
                    }}
                  >
                    Quick Buy
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Waiting for new tokens...</p>
            </div>
          )}
        </div>
      </div>

      {/* Right-hand sidebar */}
      <div className="flex-1 p-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          PumpFun Vision
        </h1>
        <p className="text-muted-foreground mt-2">
          Select a token to view detailed analytics
        </p>
        <div className="text-sm mt-4 text-muted-foreground">
          Current SOL Price:{" "}
          {solPrice ? (
            <span className="font-bold text-white">${solPrice.toFixed(2)}</span>
          ) : (
            "Loading..."
          )}
        </div>
      </div>
    </div>
  );
};

export default PumpFunVision;