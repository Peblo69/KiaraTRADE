import { FC, useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import TokenChart from "@/components/TokenChart";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface TokenRowProps {
  token: any;
  onClick: () => void;
}

// Memoize token row to prevent unnecessary re-renders
const TokenRow: FC<TokenRowProps> = ({ token, onClick }) => {
  // Memoize click handler
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <Card 
      className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
      onClick={handleClick}
    >
      <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 items-center">
        <div className="flex items-center gap-3">
          <img
            src={token.imageLink || 'https://via.placeholder.com/150'}
            alt={`${token.symbol} logo`}
            className="w-10 h-10 rounded-full object-cover bg-purple-500/20"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
            }}
          />
          <div>
            <div className="font-medium group-hover:text-purple-400 transition-colors">
              {token.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {token.symbol}
            </div>
          </div>
        </div>
        <div className="text-right font-medium">
          {formatPrice(token.price)}
        </div>
        <div className="text-right">
          {formatMarketCap(token.marketCap)}
        </div>
        <div className="text-right">
          {formatMarketCap(token.liquidity)}
        </div>
        <div className="text-right">
          {formatMarketCap(token.volume)}
        </div>
      </div>
    </Card>
  );
};

// Helper functions
const formatPrice = (price: number) => {
  if (!price) return '$0.00';
  return `$${price.toFixed(8)}`;
};

const formatMarketCap = (value: number) => {
  if (!value) return '$0.00';
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const PumpFunVision: FC = () => {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  // Use refs to prevent unnecessary re-renders
  const tokens = usePumpPortalStore(useCallback(state => state.tokens, []));
  const isConnected = usePumpPortalStore(useCallback(state => state.isConnected, []));

  // Handle back navigation
  const handleBack = useCallback(() => {
    setSelectedToken(null);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up any subscriptions or side effects
      setSelectedToken(null);
    };
  }, []);

  // Debug logs
  useEffect(() => {
    console.log('[PumpFunVision] Render state:', {
      timestamp: new Date().toISOString(),
      selectedToken,
      tokensCount: tokens.length,
      isConnected
    });
  }, [selectedToken, tokens.length, isConnected]);

  if (selectedToken) {
    return (
      <ErrorBoundary>
        <TokenChart 
          tokenAddress={selectedToken} 
          onBack={handleBack}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">PumpFun Vision</h1>
            <p className="text-sm text-muted-foreground">
              Track newly created tokens and their performance
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 px-4 py-2 text-sm text-muted-foreground">
            <div>Token</div>
            <div className="text-right">Price</div>
            <div className="text-right">Market Cap</div>
            <div className="text-right">Liquidity</div>
            <div className="text-right">Volume</div>
          </div>

          {!isConnected ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : tokens.length > 0 ? (
            <div className="space-y-2">
              {tokens.map((token) => (
                <TokenRow
                  key={token.address}
                  token={token}
                  onClick={() => setSelectedToken(token.address)}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Waiting for new tokens...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PumpFunVision;