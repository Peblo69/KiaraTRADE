import { useEffect } from 'react';
import { useToast } from "@/hooks/use-toast"
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useSolanaMonitor } from "@/lib/solana-monitor";

export function NewTokenAlert() {
  const { toast } = useToast();
  const pumpFunTokens = usePumpPortalStore((state) => state.tokens);
  const solanaTokens = useSolanaMonitor((state) => state.tokens);

  useEffect(() => {
    const handleNewPumpFunToken = () => {
      if (pumpFunTokens.length > 0) {
        const latestToken = pumpFunTokens[0];
        toast({
          title: "New PumpFun Token! 🚀",
          description: `${latestToken.name} (${latestToken.symbol})\nPrice: $${latestToken.price.toFixed(8)}\nMarket Cap: $${latestToken.marketCap.toFixed(2)}`,
          duration: 5000,
        });
      }
    };

    const handleNewSolanaToken = () => {
      if (solanaTokens.length > 0) {
        const latestToken = solanaTokens[0];
        toast({
          title: "New Solana Token Detected! 🌟",
          description: `Address: ${latestToken.address}\nCreated: ${latestToken.createdAt.toLocaleTimeString()}`,
          duration: 5000,
          variant: "purple",
        });
      }
    };

    // Subscribe to both token arrays changes
    handleNewPumpFunToken();
    handleNewSolanaToken();
  }, [pumpFunTokens.length, solanaTokens.length]); // Run when either array length changes

  return null;
}