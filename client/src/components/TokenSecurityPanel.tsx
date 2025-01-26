```tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TokenSecurityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  tokenData: {
    name: string;
    symbol: string;
    mintAuthority: boolean;
    freezeAuthority: boolean;
    liquidity: number;
    lpCount: number;
    topHolderPct: number;
    holderCount: number;
    riskScore: number;
  };
}

export function TokenSecurityPanel({
  isOpen,
  onClose,
  onRefresh,
  tokenData
}: TokenSecurityPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full overflow-hidden"
        >
          <Card className="p-4 bg-card/95 backdrop-blur border-accent">
            {/* Header with Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">Security Analysis</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRefresh}
                  className="h-8 w-8"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Security Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Control Section */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="custom-emoji-control" /> Control
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs flex justify-between">
                    <span>Mint Authority</span>
                    <span className={cn(
                      "rounded px-1",
                      tokenData.mintAuthority 
                        ? "text-red-500 bg-red-500/10" 
                        : "text-green-500 bg-green-500/10"
                    )}>
                      {tokenData.mintAuthority ? "Enabled" : "Safe"}
                    </span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span>Freeze Authority</span>
                    <span className={cn(
                      "rounded px-1",
                      tokenData.freezeAuthority 
                        ? "text-red-500 bg-red-500/10" 
                        : "text-green-500 bg-green-500/10"
                    )}>
                      {tokenData.freezeAuthority ? "Enabled" : "Safe"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Market Health */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="custom-emoji-market" /> Market
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs flex justify-between">
                    <span>Liquidity</span>
                    <span className="font-medium">
                      {tokenData.liquidity.toLocaleString()} SOL
                    </span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span>LP Count</span>
                    <span className="font-medium">{tokenData.lpCount}</span>
                  </div>
                </div>
              </div>

              {/* Holder Info */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="custom-emoji-holders" /> Holders
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs flex justify-between">
                    <span>Top Holder</span>
                    <span className={cn(
                      "rounded px-1",
                      tokenData.topHolderPct > 80 
                        ? "text-red-500 bg-red-500/10"
                        : tokenData.topHolderPct > 50
                        ? "text-yellow-500 bg-yellow-500/10"
                        : "text-green-500 bg-green-500/10"
                    )}>
                      {tokenData.topHolderPct}%
                    </span>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span>Total Holders</span>
                    <span className="font-medium">{tokenData.holderCount}</span>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="custom-emoji-risk" /> Risk
                </div>
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    tokenData.riskScore > 70
                      ? "bg-red-500/20 text-red-500"
                      : tokenData.riskScore > 40
                      ? "bg-yellow-500/20 text-yellow-500"
                      : "bg-green-500/20 text-green-500"
                  )}>
                    Score: {tokenData.riskScore}/100
                    <span className="ml-1">
                      {tokenData.riskScore > 70 ? "HIGH" 
                       : tokenData.riskScore > 40 ? "MED" 
                       : "LOW"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```
