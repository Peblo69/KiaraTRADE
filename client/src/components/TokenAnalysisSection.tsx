// client/src/components/TokenAnalysisSection.tsx
import { FC, useEffect } from 'react';
import { TokenAnalysisWrapper } from './TokenSecurityButton';
import { useWebSocket } from '@/lib/websocket-manager';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface TokenAnalysisSectionProps {
  tokenAddress: string;
  className?: string;
}

export const TokenAnalysisSection: FC<TokenAnalysisSectionProps> = ({ 
  tokenAddress, 
  className 
}) => {
  const { connect, isConnected } = useWebSocket();
  const currentTime = usePumpPortalStore(state => state.currentTime);
  const currentUser = usePumpPortalStore(state => state.currentUser);

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
        <span>Analysis Time (UTC): {currentTime}</span>
        <span>Analyst: {currentUser}</span>
      </div>
      <TokenAnalysisWrapper tokenAddress={tokenAddress} />
    </div>
  );
};