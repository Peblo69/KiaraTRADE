import React from 'react';
import MarketStats from '@/components/MarketStats';
import TradeHistory from '@/components/TradeHistory';

interface Props {
  tokenAddress: string;
}

const TokenPage: React.FC<Props> = ({ tokenAddress }) => {
  return (
    <div className="space-y-8 p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <MarketStats tokenAddress={tokenAddress} />
        <div className="p-6 rounded-lg border border-purple-500/20 bg-card">
          <TradeHistory tokenAddress={tokenAddress} />
        </div>
      </div>
    </div>
  );
};

export default TokenPage;
