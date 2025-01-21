// FILE: PumpFunVision.tsx
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

/** 
 * Safely convert the string "12345.67" -> "$12K" style. 
 * If "N/A", returns "N/A". 
 */
function formatUsdShort(value: string): string {
  if (value === "N/A") return "N/A";
  const numeric = parseFloat(value);
  if (Number.isNaN(numeric)) return "N/A";
  // e.g. "15000" => "$15K", with 2 decimals
  return `$${millify(numeric, { precision: 2 })}`;
}

/** 
 * If you want to abbreviate large volumes (which is a numeric field),
 * do the same approach but for number. 
 */
function formatNumberShort(num: number): string {
  if (!num || num <= 0) return "$0";
  return `$${millify(num, { precision: 2 })}`;
}

/** 
 * Convert time difference (timestamp -> "10s ago").
 */
function getTimeDiff(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  return `${seconds}s ago`;
}

/** 
 * Convert status booleans -> array of label strings:
 * e.g. { mad: true, fad: true, lb: false, tri: true } => ["MAD","FAD","T10"]
 */
function getStatusLabels(status: PumpPortalToken["status"]): string[] {
  const labels: string[] = [];
  if (status.mad) labels.push("MAD");
  if (status.fad) labels.push("FAD");
  if (status.lb) labels.push("LB");
  if (status.tri) labels.push("T10");
  return labels;
}

const PumpFunVision: FC = () => {
  const tokens = usePumpPortalStore((state) => state.tokens);
  const isConnected = usePumpPortalStore((state) => state.isConnected);
  const solPrice = usePumpPortalStore((state) => state.solPrice);

  const { toast } = useToast();

  useEffect(() => {
    console.log("[PumpFunVision] isConnected:", isConnected);
    console.log("[PumpFunVision] solPrice:", solPrice);
    console.log("[PumpFunVision] tokens:", tokens);
  }, [isConnected, solPrice, tokens]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* MAIN CONTENT */}
      <div className="w-full max-w-[1200px] mx-auto p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 text-green-400">
            <span className="text-sm">🔥 New Pairs</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Find the latest tokens across chains
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr] gap-3 px-4 py-2 text-xs text-muted-foreground">
          <div>Token</div>
          <div className="text-right">Created</div>
          <div className="text-right">Liquidity</div>
          <div className="text-right">I.Liquidity</div>
          <div className="text-right">MarketCap</div>
          <div className="text-right">Swaps</div>
          <div className="text-right">Volume</div>
          <div className="text-center">Audit</div>
          <div className="text-center">Quick Buy</div>
        </div>

        {/* Table Rows */}
        <div className="space-y-1">
          {!isConnected ? (
            // If not connected, show loading spinner
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : tokens.length > 0 ? (
            tokens.map((token: PumpPortalToken) => {
              // Convert strings to short K/M format
              const shortLiquidity = formatUsdShort(token.liquidity);
              const shortL1 = formatUsdShort(token.l1Liquidity);
              const shortMcap = formatUsdShort(token.marketCap);

              // Volume is a number
              const shortVolume = formatNumberShort(token.volume);

              // statuses -> array of labels
              const statusLabels = getStatusLabels(token.status);

              return (
                <Card
                  key={`${token.symbol}-${token.timestamp}`}
                  className="hover:bg-accent/5 transition-all duration-300 cursor-pointer"
                >
                  <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr,1fr] gap-3 px-4 py-3 items-center">
                    {/* Token Symbol/Name */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                        {token.symbol ? token.symbol[0] : "?"}
                      </div>
                      <div>
                        <div className="font-medium">{token.symbol || "??"}</div>
                        <div className="text-xs text-muted-foreground">
                          {token.name || "Unknown Name"}
                        </div>
                      </div>
                    </div>

                    {/* Created (time diff) */}
                    <div className="text-right font-mono text-muted-foreground">
                      {token.timestamp ? getTimeDiff(token.timestamp) : "N/A"}
                    </div>

                    {/* Liquidity (short K/M) */}
                    <div className="text-right font-mono">
                      {shortLiquidity}
                    </div>

                    {/* I.Liquidity (short K/M) */}
                    <div className="text-right font-mono">
                      {shortL1}
                    </div>

                    {/* MarketCap (short K/M) */}
                    <div className="text-right font-mono">
                      {shortMcap}
                    </div>

                    {/* Swaps */}
                    <div className="text-right font-mono">{token.swaps || 0}</div>

                    {/* Volume (short K/M) */}
                    <div className="text-right font-mono">{shortVolume}</div>

                    {/* Audit (status badges) */}
                    <div className="flex justify-center gap-1">
                      {statusLabels.length > 0 ? (
                        statusLabels.map((lbl) => (
                          <span
                            key={lbl}
                            className="px-2 py-0.5 rounded text-xs bg-green-800 text-green-200"
                          >
                            {lbl}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Quick Buy */}
                    <div className="flex justify-center">
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
                        {/* Example: show a lightning icon + $0 
                            or something that matches your design */}
                        <span className="mr-1">⚡</span> $0
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            // If connected but no tokens come in yet
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Waiting for new tokens...</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
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
