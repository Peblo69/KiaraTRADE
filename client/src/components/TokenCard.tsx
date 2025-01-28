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
    metadata?: {
      name: string;
      symbol: string;
      uri?: string;
    };
  };
  analytics?: any;
}

export function TokenCard({ token, analytics }: TokenCardProps) {
  // Use metadata if available, otherwise fallback to token properties
  // Display name and symbol in reverse order from before: name on top, symbol below
  const displayName = token.name || token.metadata?.name || `Token ${token.address.slice(0, 8)}`;
  const displaySymbol = token.symbol || token.metadata?.symbol || token.address.slice(0, 6).toUpperCase();
  const displayPrice = token.priceInUsd || 0;

  return (
    <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-900/10 hover:border-purple-500/40 transition-colors">
      {/* Token Name and Symbol (reversed order) */}
      <div className="mb-2">
        <div className="text-lg font-semibold text-purple-300">
          {displayName}
        </div>
        <FuturisticText variant="div" className="text-sm text-muted-foreground mt-1">
          {displaySymbol}
        </FuturisticText>
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

      {/* Token Address */}
      <div className="mt-2 space-y-1">
        <div className="text-sm text-muted-foreground">🔑 Token</div>
        <div className="font-medium text-xs truncate">
          {token.address}
        </div>
      </div>

      <TokenSecurityButton tokenAddress={token.address} className="mt-4" />

      {analytics && (
        <div className="mt-4">
          {/* Analytics details here */}
        </div>
      )}
    </div>
  );
}