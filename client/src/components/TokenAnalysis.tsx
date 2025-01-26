import { FC, useState } from 'react';
import { Shield, AlertTriangle, Info, Activity, Users, Wallet, Lock, TrendingUp } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { analyzeToken } from '../lib/token-analysis';

interface Props {
  tokenAddress: string;
  onAnalyze?: typeof analyzeToken;
}

interface Holder {
  address: string;
  pct: number;
}

interface Risk {
  name: string;
  score: number;
}

export const TokenAnalysis: FC<Props> = ({ tokenAddress, onAnalyze = analyzeToken }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    try {
      console.log('[TokenAnalysis] Starting analysis for:', tokenAddress);
      setIsLoading(true);
      setError(null);
      const data = await onAnalyze(tokenAddress);
      console.log('[TokenAnalysis] Analysis result:', data);
      setAnalysis(data);
    } catch (err) {
      console.error('[TokenAnalysis] Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze token');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const formatNumber = (num: number) =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
    }).format(num);

  const getRiskColor = (score: number) => {
    if (score >= 75) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (score >= 40) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-green-500 bg-green-500/10 border-green-500/20';
  };

  const getProgressColor = (score: number) => {
    if (score >= 75) return 'bg-red-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRiskEmoji = (score: number) => {
    if (score >= 75) return '⚠️';
    if (score >= 40) return '⚡';
    return '✅';
  };

  if (error) {
    return (
      <Card className="p-4 bg-red-500/10 border-red-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
        <Button
          onClick={handleAnalyze}
          variant="outline"
          className="mt-2"
          size="sm"
        >
          Retry Analysis
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!analysis ? (
        <Button
          onClick={handleAnalyze}
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Analyzing Token...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Analyze Token Security
            </div>
          )}
        </Button>
      ) : (
        <div className="space-y-4">
          {/* Overall Risk Score */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <h3 className="text-lg font-medium">Security Score</h3>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${getRiskColor(analysis.rugScore)}`}>
                      {getRiskEmoji(analysis.rugScore)}
                      {analysis.rugScore}/100
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Token Security Rating</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Progress
              value={analysis.rugScore}
              className={`h-2.5 mt-2 ${getProgressColor(analysis.rugScore)}`}
            />
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* Authority Status */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4" />
                <h4 className="font-medium">Control</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-sm flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" />
                          Mint Authority
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ability to create new tokens</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className={`px-2 py-0.5 rounded text-sm ${
                    analysis.mintAuthority !== "N/A"
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-green-500/10 text-green-400'
                  }`}>
                    {analysis.mintAuthority !== "N/A" ? '🔓 Enabled' : '🔒 Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-sm flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" />
                          Freeze Authority
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ability to freeze token transfers</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className={`px-2 py-0.5 rounded text-sm ${
                    analysis.freezeAuthority !== "N/A"
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-green-500/10 text-green-400'
                  }`}>
                    {analysis.freezeAuthority !== "N/A" ? '🔓 Enabled' : '🔒 Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-sm flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" />
                          Contract
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Contract modification status</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className={`px-2 py-0.5 rounded text-sm ${
                    !analysis.mutable
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {!analysis.mutable ? '🔒 Immutable' : '⚠️ Mutable'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Market Health */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" />
                <h4 className="font-medium">Market Health</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">💧 Liquidity</span>
                  <span className="text-sm font-medium">${formatNumber(analysis.totalMarketLiquidity)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">🏦 Active Markets</span>
                  <span className="text-sm font-medium">{analysis.markets.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">👥 LP Count</span>
                  <span className="text-sm font-medium">{analysis.totalLPProviders}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Top Holders */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4" />
              <h4 className="font-medium">Top Holders</h4>
            </div>
            <div className="space-y-2">
              {analysis.topHolders.slice(0, 3).map((holder, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 opacity-50" />
                    <span className="text-sm font-medium">{formatAddress(holder.address)}</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    holder.pct > 50 ? 'text-red-400' :
                      holder.pct > 25 ? 'text-yellow-400' :
                        'text-green-400'
                  }`}>
                    {holder.pct.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Risk Factors */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4" />
              <h4 className="font-medium">Risk Factors</h4>
            </div>
            <div className="space-y-2">
              {analysis.risks.map((risk, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${getRiskColor(risk.score)}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{getRiskEmoji(risk.score)}</span>
                    <div className="text-sm font-medium">{risk.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Button
            onClick={handleAnalyze}
            variant="outline"
            size="sm"
            className="w-full mt-4"
          >
            🔄 Refresh Analysis
          </Button>
        </div>
      )}
    </div>
  );
};