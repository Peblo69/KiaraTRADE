import { useEffect } from 'react';
import { useToast } from "@/hooks/use-toast"
import { useUnifiedTokenStore } from "@/lib/unified-token-store";

export function NewTokenAlert() {
  const { toast } = useToast();
  const tokens = useUnifiedTokenStore((state) => state.tokens);
  const solPrice = useUnifiedTokenStore((state) => state.solPrice);

  useEffect(() => {
    const handleNewToken = () => {
      if (tokens.length > 0) {
        const latestToken = tokens[0];
        const priceUsd = (latestToken.price || 0) * (solPrice || 0);

        toast({
          title: "New Token Created! 🚀",
          description: `${latestToken.name} (${latestToken.symbol})\nPrice: $${priceUsd.toFixed(8)}\nMarket Cap: $${(latestToken.marketCap || 0).toFixed(2)}`,
          duration: 5000,
        });
      }
    };

    // Subscribe to tokens array changes
    handleNewToken();
  }, [tokens.length, solPrice]); // Run when tokens array length or SOL price changes

  return null;
}