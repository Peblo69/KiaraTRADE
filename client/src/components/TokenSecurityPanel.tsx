// client/src/components/TokenSecurityPanel.tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TokenAnalysisData } from "@/lib/token-analysis";
import { motion } from "framer-motion";
import { ShieldAlert, Activity, AlertTriangle, Loader2, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

// Constants
const UTC_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";

interface TokenSecurityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tokenAddress: string;
  analysisData: TokenAnalysisData | null;
  error: string | null;
  isLoading: boolean;
}

// Helper Components
interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-500">{label}:</span>
    <span className="text-white">{value}</span>
  </div>
);

interface SecurityBadgeProps {
  condition: boolean;
  trueText: string;
  falseText: string;
  tooltip: string;
}

const SecurityBadge: React.FC<SecurityBadgeProps> = ({
  condition,
  trueText,
  falseText,
  tooltip
}) => (
  <div
    className={cn(
      "px-3 py-1.5 rounded-full text-xs font-medium cursor-help",
      condition
        ? "bg-green-500/20 text-green-400 border border-green-500/20"
        : "bg-red-500/20 text-red-400 border border-red-500/20"
    )}
    title={tooltip}
  >
    {condition ? trueText : falseText}
  </div>
);

interface MarketCardProps {
  label: string;
  value: string | number;
  indicator: 'positive' | 'warning' | 'negative';
}

const MarketCard: React.FC<MarketCardProps> = ({
  label,
  value,
  indicator
}) => (
  <div className="bg-gray-900/20 p-3 rounded-lg">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className={cn(
      "text-lg font-medium",
      indicator === 'positive' ? "text-green-400" :
      indicator === 'warning' ? "text-yellow-400" :
      "text-red-400"
    )}>
      {value}
    </div>
  </div>
);

interface RiskFactorProps {
  name: string;
  score: number;
  max: number;
}

const RiskFactor: React.FC<RiskFactorProps> = ({ name, score, max }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-gray-400">
        {name.split(/(?=[A-Z])/).join(' ')}
      </span>
      <span className={cn(
        "font-medium",
        score > (max * 0.7) ? "text-red-400" :
        score > (max * 0.4) ? "text-yellow-400" :
        "text-green-400"
      )}>
        {score} pts
      </span>
    </div>
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          score > (max * 0.7) ? "bg-red-400" :
          score > (max * 0.4) ? "bg-yellow-400" :
          "bg-green-400"
        )}
        style={{ width: `${(score / max) * 100}%` }}
      />
    </div>
  </div>
);

export const TokenSecurityPanel: React.FC<TokenSecurityPanelProps> = ({
  isOpen,
  onClose,
  tokenAddress,
  analysisData,
  error,
  isLoading
}) => {
  // PumpPortal store integration
  const tokens = usePumpPortalStore(state => state.tokens);
  const currentTime = usePumpPortalStore(state => state.currentTime);
  const currentUser = usePumpPortalStore(state => state.currentUser);
  const isConnected = usePumpPortalStore(state => state.isConnected);

  if (!isOpen) return null;

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  // Connection status check
  if (!isConnected) {
    return (
      <Card className="h-full bg-[#0a0b1c] border-l border-gray-800 rounded-none">
        <div className="p-4 flex flex-col items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-2" />
          <span className="text-gray-400">Connecting to PumpPortal...</span>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full bg-[#0a0b1c] border-l border-gray-800 rounded-none">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>Analysis Error</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 hover:bg-gray-800"
            >
              <AlertTriangle className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
          <p className="text-red-400">{error}</p>
        </div>
      </Card>
    );
  }

  // Loading state
  if (isLoading || !analysisData) {
    return (
      <Card className="h-full bg-[#0a0b1c] border-l border-gray-800 rounded-none">
        <div className="p-4 flex flex-col items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-2" />
          <span className="text-gray-400">Analyzing token security...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-[#0a0b1c] border-l border-gray-800 rounded-none overflow-y-auto">
      <div className="p-4">
        {/* Header with Analysis Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-purple-500" />
            <span className="font-semibold text-white">Security Analysis</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{currentTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User className="h-4 w-4" />
              <span>{currentUser}</span>
            </div>
          </div>
        </div>

        {/* Token Count */}
        <div className="mb-4 text-sm text-gray-400">
          Active Tokens: {tokens.length}
        </div>

        {/* Risk Alert Banner */}
        {analysisData.risks.level === 'HIGH' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/20 border border-red-500/20 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">High Risk Token Detected</span>
            </div>
            <p className="mt-2 text-sm text-red-400/80">
              This token shows multiple high-risk indicators. Trade with extreme caution.
            </p>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Token Information */}
          <section className="p-4 bg-gray-900/20 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Token Information</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Name" value={analysisData.tokenInfo.name} />
              <InfoRow label="Symbol" value={analysisData.tokenInfo.symbol} />
              <InfoRow label="Supply" value={analysisData.tokenInfo.supply} />
              <InfoRow label="Decimals" value={analysisData.tokenInfo.decimals.toString()} />
              <InfoRow label="Created" value={format(new Date(analysisData.tokenInfo.createdAt), UTC_DATE_FORMAT)} />
            </div>
          </section>

          {/* Security Status */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Security Status</h3>
            <div className="flex gap-2 flex-wrap">
              <SecurityBadge
                condition={!analysisData.security.mintAuthority}
                trueText="✅ Mint Locked"
                falseText="⚠️ Mint Enabled"
                tooltip={analysisData.security.mintAuthority ? 
                  "Token minting is not locked" : 
                  "Token minting is locked"}
              />
              <SecurityBadge
                condition={!analysisData.security.freezeAuthority}
                trueText="✅ No Freeze"
                falseText="⚠️ Freeze Enabled"
                tooltip={analysisData.security.freezeAuthority ?
                  "Token accounts can be frozen" :
                  "Token accounts cannot be frozen"}
              />
              <SecurityBadge
                condition={!analysisData.security.mutable}
                trueText="✅ Immutable"
                falseText="⚠️ Mutable"
                tooltip={analysisData.security.mutable ?
                  "Token metadata can be changed" :
                  "Token metadata is locked"}
              />
            </div>
          </section>

          {/* Risk Assessment */}
          <section className="p-4 bg-gray-900/20 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Risk Assessment</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Overall Risk</span>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    getRiskColor(analysisData.risks.level)
                  )}>
                    {analysisData.risks.score}/100
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    getRiskColor(analysisData.risks.level)
                  )}>
                    {analysisData.risks.level} RISK
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(analysisData.risks.factors).map(([factor, score]) => (
                  <RiskFactor
                    key={factor}
                    name={factor}
                    score={score}
                    max={30}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Market Analysis */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Market Analysis</h3>
            <div className="grid grid-cols-2 gap-4">
              <MarketCard
                label="Total Markets"
                value={analysisData.market.totalMarkets}
                indicator={analysisData.market.totalMarkets > 0 ? 'positive' : 'negative'}
              />
              <MarketCard
                label="LP Providers"
                value={analysisData.market.lpProviders}
                indicator={analysisData.market.lpProviders >= 3 ? 'positive' : 'warning'}
              />
              <MarketCard
                label="Total Liquidity"
                value={`${analysisData.market.totalLiquidity.toFixed(2)} SOL`}
                indicator={analysisData.market.totalLiquidity > 10 ? 'positive' : 'warning'}
              />
            </div>
          </section>

          {/* Rugged Warning */}
          {analysisData.risks.isRugged && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-500/20 border border-red-500/20 rounded-lg text-center"
            >
              <span className="text-lg font-bold text-red-400">
                🚨 WARNING: TOKEN IS MARKED AS RUGGED 🚨
              </span>
              <p className="mt-2 text-sm text-red-400/80">
                This token has been identified as rugged. Exercise extreme caution.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TokenSecurityPanel;