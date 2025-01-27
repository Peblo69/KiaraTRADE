import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useCallback, useMemo } from "react";
import { TokenSecurityPanel } from "./TokenSecurityPanel";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useToast } from "@/hooks/use-toast";
import { useTokenAnalysis } from "@/lib/token-analysis";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";

interface TokenSecurityButtonProps {
  tokenAddress: string;
  className?: string;
}

export function TokenSecurityButton({ 
  tokenAddress,
  className 
}: TokenSecurityButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Get token from PumpPortal store with memoized selector
  const token = usePumpPortalStore(
    useCallback(state => state.tokens.find(t => t.address === tokenAddress), [tokenAddress])
  );

  // Use the analytics hook
  const { analyze, data: analysisData, error, isLoading } = useTokenAnalysis(tokenAddress);

  const handleAnalyze = async () => {
    if (isLoading) return;

    setIsOpen(true);
    try {
      await analyze();
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze token security. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Don't render if we don't have the token in PumpPortal store
  if (!token) return null;

  const getRiskIndicatorColor = () => {
    if (!analysisData) return "bg-gray-500";

    switch (analysisData.risks?.level) {
      case 'HIGH':
        return "bg-red-500";
      case 'MEDIUM':
        return "bg-yellow-500";
      case 'LOW':
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="w-full">
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "w-full gap-2 relative border-gray-800 bg-[#0a0b1c] text-white hover:bg-gray-800/50",
          isLoading && "opacity-70 cursor-not-allowed",
          className
        )}
        onClick={handleAnalyze}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Shield className="h-4 w-4" />
        )}
        Security
        <span className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full transition-colors duration-200",
          getRiskIndicatorColor()
        )} />
      </Button>

      <TokenSecurityPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tokenAddress={tokenAddress}
        analysisData={analysisData}
        error={error}
        isLoading={isLoading}
      />
    </div>
  );
}

// Wrapper component for token analysis section
export const TokenAnalysisWrapper: React.FC<{ tokenAddress: string; className?: string }> = ({ 
  tokenAddress, 
  className 
}) => {
  return (
    <div className={cn("p-4 bg-[#0a0b1c] rounded-lg border border-gray-800", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Token Analysis</h3>
        <div className="text-xs text-gray-400">
          Analyzed by Peblo69
        </div>
      </div>
      <TokenSecurityButton tokenAddress={tokenAddress} />
    </div>
  );
};