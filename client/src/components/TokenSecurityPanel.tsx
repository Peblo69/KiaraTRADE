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
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full overflow-hidden"
        >
          <Card className="token-security-panel p-4 bg-card rounded-lg">
            {/* Header with title and controls */}
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

            {/* Control Section */}
            <div className="security-row mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">🔐 Control</span>
                <div className="flex gap-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    tokenData.mintAuthority 
                      ? "bg-destructive/20 text-destructive" 
                      : "bg-green-500/20 text-green-500"
                  )}>
                    Mint: {tokenData.mintAuthority ? '⚠️ Enabled' : '✅ Safe'}
                  </span>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    tokenData.freezeAuthority 
                      ? "bg-destructive/20 text-destructive" 
                      : "bg-green-500/20 text-green-500"
                  )}>
                    Freeze: {tokenData.freezeAuthority ? '⚠️ Enabled' : '✅ Safe'}
                  </span>
                </div>
              </div>
            </div>

            {/* Market Health */}
            <div className="security-row mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">💰 Liquidity</span>
                <div className="flex gap-2">
                  <span className="text-xs">{formatNumber(tokenData.liquidity)} SOL</span>
                  <span className="text-xs">LP: {tokenData.lpCount}</span>
                </div>
              </div>
            </div>

            {/* Holder Distribution */}
            <div className="security-row mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">👥 Holders</span>
                <div className="flex gap-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    tokenData.topHolderPct > 80 
                      ? "bg-destructive/20 text-destructive"
                      : tokenData.topHolderPct > 50 
                      ? "bg-yellow-500/20 text-yellow-500"
                      : "bg-green-500/20 text-green-500"
                  )}>
                    Top: {tokenData.topHolderPct}%
                  </span>
                  <span className="text-xs">Count: {tokenData.holderCount}</span>
                </div>
              </div>
            </div>

            {/* Risk Score */}
            <div className="security-row">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risk Score</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs",
                    tokenData.riskScore > 70 
                      ? "bg-destructive/20 text-destructive" 
                      : tokenData.riskScore > 40 
                      ? "bg-yellow-500/20 text-yellow-500" 
                      : "bg-green-500/20 text-green-500"
                  )}>
                    {tokenData.riskScore}/100
                    {tokenData.riskScore > 70 ? ' 🔴' : tokenData.riskScore > 40 ? ' 🟡' : ' 🟢'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}