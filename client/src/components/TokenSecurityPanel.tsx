import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { X, RefreshCw, ArrowRight } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <Card className="h-full bg-[#0a0b1c] border-l border-gray-800 rounded-none">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">Security Analysis</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="h-8 w-8 hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-gray-800"
          >
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </Button>
        </div>

        {/* Control Section */}
        <div className="mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">🔐 Control</span>
            <div className="flex gap-2">
              <span className={cn(
                "text-xs px-2 py-1 rounded font-medium",
                tokenData.mintAuthority 
                  ? "bg-red-500/20 text-red-400 border border-red-500/20" 
                  : "bg-green-500/20 text-green-400 border border-green-500/20"
              )}>
                Mint: {tokenData.mintAuthority ? '⚠️ Enabled' : '✅ Safe'}
              </span>
              <span className={cn(
                "text-xs px-2 py-1 rounded font-medium",
                tokenData.freezeAuthority 
                  ? "bg-red-500/20 text-red-400 border border-red-500/20" 
                  : "bg-green-500/20 text-green-400 border border-green-500/20"
              )}>
                Freeze: {tokenData.freezeAuthority ? '⚠️ Enabled' : '✅ Safe'}
              </span>
            </div>
          </div>
        </div>

        {/* Liquidity Section */}
        <div className="mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">💰 Liquidity</span>
            <div className="flex gap-2">
              <span className="text-xs text-white">{tokenData.liquidity.toFixed(2)} SOL</span>
              <span className="text-xs text-white">LP: {tokenData.lpCount}</span>
            </div>
          </div>
        </div>

        {/* Holder Distribution */}
        <div className="mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">👥 Holders</span>
            <div className="flex gap-2">
              <span className={cn(
                "text-xs px-2 py-1 rounded font-medium",
                tokenData.topHolderPct > 80 
                  ? "bg-red-500/20 text-red-400 border border-red-500/20"
                  : tokenData.topHolderPct > 50 
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20"
                  : "bg-green-500/20 text-green-400 border border-green-500/20"
              )}>
                Top: {tokenData.topHolderPct}%
              </span>
              <span className="text-xs text-white">Count: {tokenData.holderCount}</span>
            </div>
          </div>
        </div>

        {/* Risk Score */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Risk Score</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                tokenData.riskScore > 70 
                  ? "bg-red-500/20 text-red-400 border border-red-500/20" 
                  : tokenData.riskScore > 40 
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20" 
                  : "bg-green-500/20 text-green-400 border border-green-500/20"
              )}>
                {tokenData.riskScore}/100
                {tokenData.riskScore > 70 ? ' 🔴' : tokenData.riskScore > 40 ? ' 🟡' : ' 🟢'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}