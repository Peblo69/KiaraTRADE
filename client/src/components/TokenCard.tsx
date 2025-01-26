import { TokenSecurityButton } from "@/components/TokenSecurityButton";
import { formatNumber } from "@/lib/utils";

interface TokenCardProps {
  token: {
    address: string;
    price: number;
  };
  analytics?: any;
}

export function TokenCard({ token, analytics }: TokenCardProps) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">💎 Price</div>
      <div className="font-medium">${formatNumber(token.price)}</div>

      <TokenSecurityButton tokenAddress={token.address} className="mt-2" />

      {analytics && (
        <div className="mt-2">
          {/* Analytics details here */}
        </div>
      )}
    </div>
  );
}