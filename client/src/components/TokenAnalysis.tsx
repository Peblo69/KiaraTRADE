import { FC } from "react";
import { TokenSecurityButton } from "./TokenSecurityButton";
import { Card } from "./ui/card";

interface TokenAnalysisProps {
  tokenAddress: string;
  className?: string;
}

export const TokenAnalysis: FC<TokenAnalysisProps> = ({ tokenAddress, className }) => {
  return (
    <Card className={className}>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Token Analysis</h3>
        <TokenSecurityButton tokenAddress={tokenAddress} />
      </div>
    </Card>
  );
};
