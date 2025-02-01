import React from 'react';
import { Card } from '@/components/ui/card';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress: string;
}

const TradingChart: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  if (!token) return null;

  return (
    <Card className="p-4 bg-[#0D0B1F] border-purple-900/30 h-[400px]">
      <div className="h-full flex items-center justify-center text-purple-300">
        Trading chart implementation coming soon
      </div>
    </Card>
  );
};

export default TradingChart;