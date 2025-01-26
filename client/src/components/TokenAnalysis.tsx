import { FC, useEffect, useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { analyzeToken } from '../lib/token-analysis';

interface Props {
  tokenAddress: string;
}

export const TokenAnalysis: FC<Props> = ({ tokenAddress }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!tokenAddress) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await analyzeToken(tokenAddress);
        console.log('[TokenAnalysis] Analysis data:', data);
        setAnalysis(data);
      } catch (err) {
        console.error('[TokenAnalysis] Analysis failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to analyze token');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [tokenAddress]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <p>Analyzing token security...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 bg-red-500/10 border-red-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <Card className="p-4 space-y-4">
      {/* Security Score */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5" />
          <h3 className="text-lg font-medium">Security Score</h3>
          <span className="ml-auto text-green-400">{analysis?.rugScore ? (100 - analysis.rugScore) : 0}/100</span>
        </div>
        <Progress value={analysis?.rugScore ? (100 - analysis.rugScore) : 0} className="h-2.5" />
      </div>

      {/* Control Section */}
      <div>
        <h4 className="mb-2 font-medium">Control</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Mint Authority</span>
            <span className={analysis?.mintAuthority !== "N/A" ? "text-red-400" : "text-green-400"}>{analysis?.mintAuthority !== "N/A" ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span>Freeze Authority</span>
            <span className={analysis?.freezeAuthority !== "N/A" ? "text-red-400" : "text-green-400"}>{analysis?.freezeAuthority !== "N/A" ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span>Contract</span>
            <span className={analysis?.mutable ? "text-yellow-400" : "text-green-400"}>{analysis?.mutable ? 'Mutable' : 'Immutable'}</span>
          </div>
        </div>
      </div>

      {/* Market Health */}
      <div>
        <h4 className="mb-2 font-medium">Market Health</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Liquidity</span>
            <span>${analysis?.totalMarketLiquidity ? analysis.totalMarketLiquidity : 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Active Markets</span>
            <span>{analysis?.markets?.length ? analysis.markets.length : 0}</span>
          </div>
          <div className="flex justify-between">
            <span>LP Count</span>
            <span>{analysis?.totalLPProviders ? analysis.totalLPProviders : 0}</span>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div>
        <h4 className="mb-2 font-medium">Risk Factors</h4>
        <div className="space-y-2">
          {(analysis?.risks || []).map((risk: any, idx: number) => (
            <div key={idx} className={`p-2 rounded bg-green-500/10 border border-green-500/20`}>
              <div className="flex justify-between">
                <span>{risk.name}</span>
                <span>{risk.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};