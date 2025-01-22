import { useEffect } from 'react';
import { useToast } from "@/hooks/use-toast"
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";

export function NewTokenAlert() {
  const { toast } = useToast();
  const tokens = usePumpPortalStore((state) => state.tokens);

  useEffect(() => {
    const handleNewToken = () => {
      if (tokens.length > 0) {
        const latestToken = tokens[0];
        toast({
          title: "New Token Created! 🚀",
          description: `${latestToken.name} (${latestToken.symbol})\nPrice: $${latestToken.price.toFixed(8)}\nMarket Cap: $${latestToken.marketCap.toFixed(2)}`,
          duration: 5000,
        });
      }
    };

    // Subscribe to tokens array changes
    handleNewToken();
  }, [tokens.length]); // Only run when tokens array length changes

  return null;
}