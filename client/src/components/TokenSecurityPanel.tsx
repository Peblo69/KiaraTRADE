import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTokenAnalysis } from "@/lib/token-analysis";
import { motion } from "framer-motion";
import { X, RefreshCw, ArrowRight, Shield, Loader2 } from "lucide-react";

interface TokenSecurityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  tokenAddress: string;
}

export function TokenSecurityPanel({
  isOpen,
  onClose,
  onRefresh,
  tokenAddress
}: TokenSecurityPanelProps) {
  if (!isOpen) return null;

  const { data: analytics, isLoading, error, refetch } = useTokenAnalysis(tokenAddress);

  if (isLoading) {
    return (
      <Card className="h-full bg-[#0a0b1c] border-l border-gray-800 rounded-none">
        <div className="p-4 flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card className="h-full bg-[#0a0b1c] border-l border-gray-800 rounded-none">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-red-400">Error loading security data</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 hover:bg-gray-800"
            >
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          <Button onClick={() => refetch()} className="w-full">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  // Determine overall risk level based on rug score
  const getRiskLevel = (score: number) => {
    if (score > 70) return "HIGH RISK";
    if (score > 40) return "MEDIUM RISK";
    return "LOW RISK";
  };

  return (
    <Card className="h-full bg-[#0a0b1c] border-l border-gray-800 rounded-none overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">Security Analysis</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onRefresh();
                refetch();
              }}
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

        {/* Token Info */}
        <div className="mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Token Info</span>
            <div className="text-xs text-gray-400">
              {analytics.token.name} ({analytics.token.symbol})
            </div>
          </div>
        </div>

        {/* Control Section */}
        <div className="mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">🔐 Control</span>
            <div className="flex gap-2">
              <span className={cn(
                "text-xs px-2 py-1 rounded font-medium",
                analytics.token.mintAuthority 
                  ? "bg-red-500/20 text-red-400 border border-red-500/20" 
                  : "bg-green-500/20 text-green-400 border border-green-500/20"
              )}>
                Mint: {analytics.token.mintAuthority ? '⚠️ Enabled' : '✅ Safe'}
              </span>
              <span className={cn(
                "text-xs px-2 py-1 rounded font-medium",
                analytics.token.freezeAuthority 
                  ? "bg-red-500/20 text-red-400 border border-red-500/20" 
                  : "bg-green-500/20 text-green-400 border border-green-500/20"
              )}>
                Freeze: {analytics.token.freezeAuthority ? '⚠️ Enabled' : '✅ Safe'}
              </span>
            </div>
          </div>
        </div>

        {/* Trading Metrics */}
        <div className="mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">📊 Trading (24h)</span>
            <div className="flex gap-2">
              <span className="text-xs text-white">Vol: {analytics.trading.volume24h.toFixed(2)} SOL</span>
              <span className="text-xs text-white">Txns: {analytics.trading.transactions24h}</span>
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
                analytics.holders.concentration.top10Percentage > 80 
                  ? "bg-red-500/20 text-red-400 border border-red-500/20"
                  : analytics.holders.concentration.top10Percentage > 50 
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20"
                  : "bg-green-500/20 text-green-400 border border-green-500/20"
              )}>
                Top 10: {analytics.holders.concentration.top10Percentage.toFixed(1)}%
              </span>
              <span className="text-xs text-white">Total: {analytics.holders.total}</span>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            {analytics.holders.top10.slice(0, 3).map((holder, idx) => (
              <div key={idx} className="flex justify-between text-xs text-gray-400">
                <span>{holder.address.slice(0, 4)}...{holder.address.slice(-4)}</span>
                <span>{holder.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sniper Activity */}
        <div className="mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">🎯 Sniper Activity</span>
            <div className="flex gap-2">
              <span className={cn(
                "text-xs px-2 py-1 rounded font-medium",
                analytics.snipers.total > 20 
                  ? "bg-red-500/20 text-red-400 border border-red-500/20"
                  : analytics.snipers.total > 10 
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20"
                  : "bg-green-500/20 text-green-400 border border-green-500/20"
              )}>
                Count: {analytics.snipers.total}
              </span>
              <span className="text-xs text-white">
                Vol: {analytics.snipers.volume.toFixed(2)} SOL
              </span>
            </div>
          </div>
        </div>

        {/* Risk Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">⚠️ Risk Analysis</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                analytics.rugScore > 70 
                  ? "bg-red-500/20 text-red-400 border border-red-500/20" 
                  : analytics.rugScore > 40 
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20" 
                  : "bg-green-500/20 text-green-400 border border-green-500/20"
              )}>
                Score: {analytics.rugScore}/100
              </span>
              <span className={cn(
                "text-xs font-medium",
                analytics.rugScore > 70 ? "text-red-400" :
                analytics.rugScore > 40 ? "text-yellow-400" :
                "text-green-400"
              )}>
                {getRiskLevel(analytics.rugScore)}
              </span>
            </div>
          </div>

          {/* Risk Factors */}
          <div className="space-y-2 mt-3">
            {analytics.risks.map((risk, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-gray-400">{risk.name}</span>
                <div className={cn(
                  "px-2 py-1 rounded font-medium",
                  risk.score > 70 ? "text-red-400" :
                  risk.score > 40 ? "text-yellow-400" :
                  "text-green-400"
                )}>
                  {risk.score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}