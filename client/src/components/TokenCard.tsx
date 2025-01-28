import { TokenSecurityButton } from "@/components/TokenSecurityButton";
import { formatNumber } from "@/lib/utils";
import { FuturisticText } from "@/components/FuturisticText";

interface TokenCardProps {
  token: {
    address: string;
    name: string;
    symbol: string;
    price?: number;
    marketCapSol?: number;
    priceInUsd?: number;
  };
  analytics?: any;
}

export function TokenCard({ token, analytics }: TokenCardProps) {
  // Ensure we have valid values for display
  const displayName = token.name || `Token ${token.address.slice(0, 8)}`;
  const displaySymbol = token.symbol || token.address.slice(0, 6).toUpperCase();
  const displayPrice = token.priceInUsd || token.price || 0;

  return (
    <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 transition-colors">
      {/* Token Name and Symbol */}
      <div className="mb-2">
        <FuturisticText variant="h3" className="text-lg font-semibold text-purple-300">
          {displayName}
        </FuturisticText>
        <div className="text-sm text-muted-foreground mt-1">
          {displaySymbol}
        </div>
      </div>

      {/* Price Information */}
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">💎 Price</div>
        <div className="font-medium">
          ${formatNumber(displayPrice)}
        </div>
      </div>

      {/* Market Cap if available */}
      {token.marketCapSol && token.marketCapSol > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-sm text-muted-foreground">📊 Market Cap</div>
          <div className="font-medium">{formatNumber(token.marketCapSol)} SOL</div>
        </div>
      )}

      <TokenSecurityButton tokenAddress={token.address} className="mt-4" />

      {analytics && (
        <div className="mt-4">
          {/* Analytics details here */}
        </div>
      )}
    </div>
  );
}