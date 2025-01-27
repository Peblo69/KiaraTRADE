import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { TokenSecurityPanel } from "./TokenSecurityPanel";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useToast } from "@/hooks/use-toast";

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
  const [isLoading, setIsLoading] = useState(false);

  // Get token from PumpPortal store
  const token = usePumpPortalStore(
    useCallback(state => state.tokens.find(t => t.address === tokenAddress), [tokenAddress])
  );

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/token-analytics/${tokenAddress}`);
      if (!response.ok) {
        throw new Error('Failed to refresh token analysis');
      }
      const analysisData = await response.json();

      // Update PumpPortal store with new analysis
      usePumpPortalStore.getState().updateTokenAnalysis(tokenAddress, analysisData);

      toast({
        title: "Updated",
        description: "Token security analysis has been refreshed",
      });
    } catch (error) {
      console.error("Error refreshing token analysis:", error);
      toast({
        title: "Error",
        description: "Failed to refresh token analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only render if we have the token in PumpPortal store
  if (!token) return null;

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
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span>🔒</span>
        Security
        <span className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full",
          token.analysis?.risks ? 
            token.analysis.risks.some(r => r.score > 70) ? "bg-red-500" :
            token.analysis.risks.some(r => r.score > 40) ? "bg-yellow-500" :
            "bg-green-500"
          : "bg-gray-500"
        )} />
      </Button>

      <TokenSecurityPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onRefresh={handleRefresh}
        tokenAddress={tokenAddress}
      />
    </div>
  );
}