import { FC, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface TokenData {
  symbol: string;
  name?: string;
  price?: number;
  marketCap?: number;
  volume?: number;
  timestamp: number;
}

const PumpFunVision: FC = () => {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const { toast } = useToast();
  const MAX_TOKENS_DISPLAYED = 10;

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket('wss://pumpportal.fun/api/data');

        ws.onopen = () => {
          console.log('Connected to PumpPortal WebSocket');
          // Subscribe to new token events
          ws.send(JSON.stringify({
            method: "subscribeNewToken"
          }));
        };

        ws.onmessage = (event) => {
          const newTokenData = JSON.parse(event.data);
          setTokens(prevTokens => {
            const updatedTokens = [newTokenData, ...prevTokens];
            return updatedTokens.slice(0, MAX_TOKENS_DISPLAYED);
          });
          setLoading(false);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Failed to connect to PumpFun. Retrying...",
          });
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed. Reconnecting...');
          setTimeout(connectWebSocket, 5000);
        };

        return () => {
          ws.close();
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();
  }, [toast]);

  const handleTokenClick = (token: TokenData) => {
    setSelectedToken(token);
    toast({
      title: `${token.symbol} Details`,
      description: `Price: ${token.price ? `$${token.price.toFixed(6)}` : 'N/A'}
                   Volume: ${token.volume ? `$${token.volume.toLocaleString()}` : 'N/A'}
                   Market Cap: ${token.marketCap ? `$${token.marketCap.toLocaleString()}` : 'N/A'}`,
      duration: 5000,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          PumpFun Vision
        </h1>
        <p className="text-muted-foreground">
          Real-time tracking of newly created tokens on the network
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : tokens.length > 0 ? (
            tokens.map((token, index) => (
              <Card 
                key={index} 
                className="p-4 border-purple-800/20 bg-background/80 backdrop-blur-sm hover:bg-accent/50 transition-all duration-200 cursor-pointer"
                onClick={() => handleTokenClick(token)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{token.symbol}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(token.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {token.price && (
                    <div className="text-right">
                      <p className="font-mono">${token.price.toFixed(6)}</p>
                      {token.volume && (
                        <p className="text-xs text-muted-foreground">
                          Vol: ${token.volume.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Waiting for new tokens...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PumpFunVision;