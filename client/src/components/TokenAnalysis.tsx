import { FC, useState } from 'react';
import { Shield, AlertTriangle, Check, Activity } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface TokenRisk {
  name: string;
  description: string;
  level: 'low' | 'medium' | 'high';
  score: number;
}

interface TokenAnalysisData {
  basic: {
    name: string;
    symbol: string;
    totalSupply: number;
    createdAt: number;
  };
  control: {
    mintAuthorityEnabled: boolean;
    freezeAuthorityEnabled: boolean;
    isImmutable: boolean;
  };
  holders: {
    topHolders: Array<{
      address: string;
      balance: number;
      percentage: number;
      isInsider: boolean;
    }>;
    concentration: number;
  };
  market: {
    liquidityUSD: number;
    activeMarkets: number;
    liquidityProviders: number;
  };
  risks: TokenRisk[];
  overallScore: number;
}

interface Props {
  tokenAddress: string;
  onAnalyze: (address: string) => Promise<TokenAnalysisData>;
}

export const TokenAnalysis: FC<Props> = ({ tokenAddress, onAnalyze }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TokenAnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await onAnalyze(tokenAddress);
      setAnalysis(data);
    } catch (err) {
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
    if (score >= 75) return 'text-red-500 bg-red-500/20';
    if (score >= 40) return 'text-yellow-500 bg-yellow-500/20';
    return 'text-green-500 bg-green-500/20';
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'medium':
        return <Activity className="w-4 h-4 text-yellow-400" />;
      default:
        return <Check className="w-4 h-4 text-green-400" />;
    }
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Security Score</h3>
            <div className={`px-2 py-1 rounded text-sm ${getRiskColor(analysis.overallScore)}`}>
              {analysis.overallScore}/100
            </div>
          </div>

          <Progress
            value={analysis.overallScore}
            className="h-2"
            indicatorClassName={getRiskColor(analysis.overallScore)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm text-gray-400 mb-2">Control</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Mint Authority</span>
                  <span className={analysis.control.mintAuthorityEnabled ? 'text-red-400' : 'text-green-400'}>
                    {analysis.control.mintAuthorityEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Freeze Authority</span>
                  <span className={analysis.control.freezeAuthorityEnabled ? 'text-red-400' : 'text-green-400'}>
                    {analysis.control.freezeAuthorityEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Contract</span>
                  <span className={analysis.control.isImmutable ? 'text-green-400' : 'text-yellow-400'}>
                    {analysis.control.isImmutable ? 'Immutable' : 'Mutable'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm text-gray-400 mb-2">Market Health</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Liquidity</span>
                  <span>${formatNumber(analysis.market.liquidityUSD)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Active Markets</span>
                  <span>{analysis.market.activeMarkets}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>LP Count</span>
                  <span>{analysis.market.liquidityProviders}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm text-gray-400 mb-2">Top Holders</h4>
            <div className="space-y-1">
              {analysis.holders.topHolders.slice(0, 3).map((holder, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{formatAddress(holder.address)}</span>
                    {holder.isInsider && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                        Insider
                      </span>
                    )}
                  </div>
                  <span>{holder.percentage.toFixed(2)}%</span>
                </div>
              ))}
            </div>
            {analysis.holders.concentration > 50 && (
              <div className="mt-2 text-xs text-red-400">
                Warning: High holder concentration detected
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm text-gray-400 mb-2">Risk Factors</h4>
            <div className="space-y-2">
              {analysis.risks.map((risk, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border flex items-start gap-2 ${
                    risk.level === 'high' ? 'border-red-500/20 bg-red-500/10' :
                    risk.level === 'medium' ? 'border-yellow-500/20 bg-yellow-500/10' :
                    'border-green-500/20 bg-green-500/10'
                  }`}
                >
                  {getRiskIcon(risk.level)}
                  <div>
                    <div className="text-sm font-medium">{risk.name}</div>
                    <div className="text-xs text-gray-400">{risk.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            variant="outline"
            size="sm"
            className="w-full mt-4"
          >
            Refresh Analysis
          </Button>
        </div>
      )}
    </div>
  );
};
