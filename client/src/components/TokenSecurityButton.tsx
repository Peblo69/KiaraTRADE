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

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Add actual refresh logic here
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsLoading(false);
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
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
      >
        <span>🔒</span>
        Security
        <span className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-gray-500"
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