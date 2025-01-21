import { FC, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowLeft, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import millify from "millify";

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
function getStatusLabels(status: any): string[] { //Type changed to any to avoid errors.  Ideally, the correct type should be used from the original code.
  const labels: string[] = [];
  if (status.mad) labels.push("MAD");
  if (status.fad) labels.push("FAD");
  if (status.lb) labels.push("LB");
  if (status.tri) labels.push("T10");
  return labels;
}

const TokenView: FC<{ token: any; onBack: () => void }> = ({ token, onBack }) => {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-border/40 p-4">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-purple-500/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{token.name}</h1>
                <p className="text-sm text-muted-foreground">{token.symbol}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xl font-bold">${token.price.toFixed(6)}</div>
                <div className="text-sm text-green-500">+2.45%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-[1200px] mx-auto h-full grid grid-cols-[1fr,300px] gap-4 p-4">
            {/* Left Column - Chart and Stats */}
            <div className="space-y-4">
              {/* Chart placeholder */}
              <Card className="h-[400px] bg-background/50 flex items-center justify-center border-purple-500/20">
                <div className="text-muted-foreground">Chart Coming Soon</div>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Market Cap", value: `$${millify(token.marketCap)}` },
                  { label: "Liquidity", value: `$${millify(token.liquidity)}` },
                  { label: "Volume 24h", value: `$${millify(token.volume)}` },
                ].map((stat, idx) => (
                  <Card key={idx} className="p-4 bg-background/50 border-purple-500/20">
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className="text-lg font-bold mt-1">{stat.value}</div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right Column - Live Trades */}
            <Card className="bg-background/50 border-purple-500/20">
              <div className="p-4 border-b border-border/40">
                <h3 className="font-semibold">Live Trades</h3>
              </div>
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="p-2 space-y-2">
                  {/* Example trades - will be replaced with real data */}
                  {Array.from({ length: 20 }).map((_, idx) => (
                    <Card
                      key={idx}
                      className={`p-3 flex items-center justify-between ${
                        idx % 2 === 0
                          ? "bg-green-500/10 border-green-500/20"
                          : "bg-red-500/10 border-red-500/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {idx % 2 === 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium">
                            {idx % 2 === 0 ? "Buy" : "Sell"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Gx8k...j29F
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">0.5 SOL</div>
                        <div className="text-xs text-muted-foreground">5s ago</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const PumpFunVision: FC = () => {
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const tokens = usePumpPortalStore((state) => state.tokens);
  const isConnected = usePumpPortalStore((state) => state.isConnected);

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-[1200px] mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">PumpFun Vision</h1>
              <p className="text-sm text-muted-foreground">
                Track newly created tokens and their performance
              </p>
            </div>
          </div>

          {/* Token List */}
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 px-4 py-2 text-sm text-muted-foreground">
              <div>Token</div>
              <div className="text-right">Price</div>
              <div className="text-right">Market Cap</div>
              <div className="text-right">Liquidity</div>
              <div className="text-right">Volume</div>
            </div>

            {/* Token Rows */}
            {!isConnected ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : tokens.length > 0 ? (
              tokens.map((token) => (
                <Card
                  key={token.address}
                  className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
                  onClick={() => setSelectedToken(token)}
                >
                  <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-lg font-bold">
                        {token.symbol[0]}
                      </div>
                      <div>
                        <div className="font-medium group-hover:text-purple-400 transition-colors">
                          {token.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {token.symbol}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-medium">
                      ${token.price.toFixed(6)}
                    </div>
                    <div className="text-right">${millify(token.marketCap)}</div>
                    <div className="text-right">${millify(token.liquidity)}</div>
                    <div className="text-right">${millify(token.volume)}</div>
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
      </div>

      {/* Token Detail View */}
      {selectedToken && (
        <TokenView
          token={selectedToken}
          onBack={() => setSelectedToken(null)}
        />
      )}
    </>
  );
};

export default PumpFunVision;