import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTokenAnalysis } from "@/lib/token-analysis";
import { motion } from "framer-motion";
import { ShieldAlert, Activity, AlertTriangle, Loader2 } from "lucide-react";

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
              <AlertTriangle className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          <Button onClick={() => refetch()} className="w-full">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  // Calculate overall risk level
  const getRiskLevel = (risks: Array<{ name: string; score: number }>) => {
    const avgScore = risks.reduce((acc, risk) => acc + risk.score, 0) / risks.length;
    if (avgScore > 70) return "HIGH RISK";
    if (avgScore > 40) return "MEDIUM RISK";
    return "LOW RISK";
  };

  const riskLevel = getRiskLevel(analytics.risks);
  const avgRiskScore = Math.round(analytics.risks.reduce((acc, risk) => acc + risk.score, 0) / analytics.risks.length);

  return (
    <Card className="h-full bg-[#0a0b1c] border-l border-gray-800 rounded-none overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-purple-500" />
            <span className="font-semibold text-white">Security Analysis</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onRefresh();
                refetch();
              }}
              className="h-8 w-8 hover:bg-gray-800"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Activity className="h-4 w-4 text-purple-500" />
              </motion.div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 hover:bg-gray-800"
            >
              <AlertTriangle className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </div>

        {/* Token Info */}
        {analytics.token && (
          <div className="mb-6 p-4 bg-gray-900/20 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Token Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="text-white">{analytics.token.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Symbol:</span>
                <span className="text-white">{analytics.token.symbol || 'Unknown'}</span>
              </div>
              {analytics.token.supply !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Supply:</span>
                  <span className="text-white">{analytics.token.supply.toLocaleString()}</span>
                </div>
              )}
              {analytics.token.created && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-white">{new Date(analytics.token.created).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Status */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Security Status</h3>
          <div className="flex gap-2 flex-wrap">
            <div className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium",
              analytics.token?.mintAuthority
                ? "bg-red-500/20 text-red-400 border border-red-500/20"
                : "bg-green-500/20 text-green-400 border border-green-500/20"
            )}>
              {analytics.token?.mintAuthority ? "⚠️ Mint Enabled" : "✅ Mint Locked"}
            </div>
            <div className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium",
              analytics.token?.freezeAuthority
                ? "bg-red-500/20 text-red-400 border border-red-500/20"
                : "bg-green-500/20 text-green-400 border border-green-500/20"
            )}>
              {analytics.token?.freezeAuthority ? "⚠️ Freeze Enabled" : "✅ No Freeze"}
            </div>
            <div className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium",
              analytics.token?.mutable
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20"
                : "bg-green-500/20 text-green-400 border border-green-500/20"
            )}>
              {analytics.token?.mutable ? "⚠️ Mutable" : "✅ Immutable"}
            </div>
          </div>
        </div>

        {/* Holder Analysis */}
        {analytics.holders && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Holder Analysis</h3>
            <div className="space-y-3">
              {analytics.holders.concentration && analytics.holders.concentration.top10Percentage !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Top 10 Holders %</span>
                  <div className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    analytics.holders.concentration.top10Percentage > 80
                      ? "bg-red-500/20 text-red-400"
                      : analytics.holders.concentration.top10Percentage > 50
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-green-500/20 text-green-400"
                  )}>
                    {analytics.holders.concentration.top10Percentage.toFixed(1)}%
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Holders</span>
                <span className="text-white text-sm">{analytics.holders.total}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sniper Activity */}
        {analytics.snipers && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Sniper Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900/20 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Count</div>
                <div className={cn(
                  "text-white font-medium",
                  analytics.snipers.total > 20
                    ? "text-red-400"
                    : analytics.snipers.total > 10
                      ? "text-yellow-400"
                      : "text-green-400"
                )}>
                  {analytics.snipers.total}
                </div>
              </div>
              {analytics.snipers.volume !== undefined && (
                <div className="bg-gray-900/20 p-3 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Volume</div>
                  <div className="text-white font-medium">{analytics.snipers.volume.toFixed(2)} SOL</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Assessment */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Risk Assessment</h3>
          <div className="bg-gray-900/20 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-500">Overall Risk</span>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  avgRiskScore > 70
                    ? "bg-red-500/20 text-red-400"
                    : avgRiskScore > 40
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-green-500/20 text-green-400"
                )}>
                  {avgRiskScore}/100
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  avgRiskScore > 70 ? "text-red-400" :
                    avgRiskScore > 40 ? "text-yellow-400" :
                      "text-green-400"
                )}>
                  {riskLevel}
                </span>
              </div>
            </div>
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
      </div>
    </Card>
  );
}