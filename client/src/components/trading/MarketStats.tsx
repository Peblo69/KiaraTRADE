import { FC } from 'react';
import { Card } from "@/components/ui/card";
import { usePumpPortalStore } from '@/lib/pump-portal-store';

export const MarketStats: FC = () => {
  const tokens = usePumpPortalStore((state) => state.tokens);

  return (
    <Card className="p-6 bg-[#0B0B1E]/80 border-purple-500/20">
      <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-4">
        Market Statistics
      </h2>
      <div className="space-y-4">
        {Object.entries(tokens).map(([address, token]) => (
          <div key={address} className="flex justify-between items-center p-3 rounded-lg bg-purple-900/20 border border-purple-500/20">
            <div className="flex items-center gap-3">
              {token.imageUrl && (
                <img src={token.imageUrl} alt={token.symbol} className="w-8 h-8 rounded-full" />
              )}
              <div>
                <p className="font-medium text-purple-100">{token.symbol}</p>
                <p className="text-sm text-purple-400">${token.priceInUsd.toFixed(4)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-300">Vol: {token.vSolInBondingCurve.toFixed(2)} SOL</p>
              <p className="text-sm text-purple-400">MCap: {token.marketCapSol.toFixed(2)} SOL</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};