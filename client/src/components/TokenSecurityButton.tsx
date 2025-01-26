```tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { TokenSecurityPanel } from "./TokenSecurityPanel";

interface TokenSecurityButtonProps {
  tokenAddress: string;
  className?: string;
}

export function TokenSecurityButton({ 
  tokenAddress,
  className 
}: TokenSecurityButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSecurityData = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API call to your security analysis endpoint
      const response = await fetch(`/api/token-security/${tokenAddress}`);
      const data = await response.json();
      setIsLoading(false);
      return data;
    } catch (error) {
      console.error("Failed to fetch security data:", error);
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSecurityData();
  };

  // Example data - replace with actual API data
  const tokenData = {
    name: "Example Token",
    symbol: "EX",
    mintAuthority: false,
    freezeAuthority: false,
    liquidity: 5573,
    lpCount: 2,
    topHolderPct: 97.86,
    holderCount: 4,
    riskScore: 40
  };

  return (
    <div className="w-full">
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "w-full gap-2 relative",
          isLoading && "opacity-70 cursor-not-allowed",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span className="custom-emoji-security" />
        Security
        <span className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full",
          tokenData.riskScore > 70 
            ? "bg-red-500" 
            : tokenData.riskScore > 40 
            ? "bg-yellow-500" 
            : "bg-green-500"
        )} />
      </Button>

      <TokenSecurityPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onRefresh={handleRefresh}
        tokenData={tokenData}
      />
    </div>
  );
}
```
