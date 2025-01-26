import { FC, useState, useEffect, useCallback, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import TokenChart from "@/components/TokenChart";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TokenRowProps {
  token: any;
  onClick: () => void;
}

const TokenCard: FC<TokenRowProps> = ({ token, onClick }) => {
  return (
    <Card 
      className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
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
              {token.symbol}
            </div>
            <div className="text-sm text-muted-foreground">
              {token.name}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Price</div>
            <div className="font-medium">{formatPrice(token.price)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Market Cap</div>
            <div className="font-medium">{formatMarketCap(token.marketCap)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Liquidity</div>
            <div className="font-medium">{formatMarketCap(token.liquidity)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Volume</div>
            <div className="font-medium">{formatMarketCap(token.volume)}</div>
          </div>
        </div>

        <div className="mt-4">
          <Tabs defaultValue="market" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="limit">Limit</TabsTrigger>
              <TabsTrigger value="dca">DCA</TabsTrigger>
            </TabsList>
          </Tabs>
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

// Main token list content
const TokenListContent: FC = () => {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  // Use callbacks for store selectors to prevent unnecessary re-renders
  const tokens = usePumpPortalStore(useCallback(state => state.tokens, []));
  const isConnected = usePumpPortalStore(useCallback(state => state.isConnected, []));
  const lastUpdate = usePumpPortalStore(useCallback(state => state.lastUpdate, []));
  const addToViewedTokens = usePumpPortalStore(useCallback(state => state.addToViewedTokens, []));
  const setActiveTokenView = usePumpPortalStore(useCallback(state => state.setActiveTokenView, []));
  const getToken = usePumpPortalStore(useCallback(state => state.getToken, []));

  // Handle token selection
  const handleTokenSelect = useCallback((address: string) => {
    setSelectedToken(address);
    setActiveTokenView(address);
    addToViewedTokens(address);
  }, [addToViewedTokens, setActiveTokenView]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (selectedToken) {
      setSelectedToken(null);
      setActiveTokenView(null);
    }
  }, [selectedToken, setActiveTokenView]);

  // Monitor health
  useEffect(() => {
    const healthCheck = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdate > 30000) {
        window.location.reload();
      }
    }, 10000);

    return () => clearInterval(healthCheck);
  }, [lastUpdate]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      setSelectedToken(null);
      setActiveTokenView(null);
    };
  }, [setActiveTokenView]);

  if (selectedToken) {
    const token = getToken(selectedToken);
    if (!token) {
      console.error('[PumpFunVision] Selected token not found:', selectedToken);
      handleBack();
      return null;
    }

    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }>
        <ErrorBoundary>
          <TokenChart 
            tokenAddress={selectedToken} 
            onBack={handleBack}
          />
        </ErrorBoundary>
      </Suspense>
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

        {!isConnected ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : tokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token) => (
              <TokenCard
                key={token.address}
                token={token}
                onClick={() => handleTokenSelect(token.address)}
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
  );
};

// Wrap with error boundary
const PumpFunVision: FC = () => {
  return (
    <ErrorBoundary>
      <TokenListContent />
    </ErrorBoundary>
  );
};

export default PumpFunVision;