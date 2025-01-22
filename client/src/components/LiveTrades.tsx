import { FC, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useHeliusStore } from "@/lib/helius-websocket";

interface Trade {
  type: 'buy' | 'sell';
  price: number;
  volume: number;
  timestamp: number;
  wallet: string;
  symbol: string;
}

export const LiveTrades: FC = () => {
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const tokens = usePumpPortalStore(state => state.tokens);

  // Watch for trade updates across all tokens
  useEffect(() => {
    const trades: Trade[] = [];
    tokens.forEach(token => {
      token.recentTrades.forEach(trade => {
        trades.push({
          type: trade.isBuy ? 'buy' : 'sell',
          price: trade.price,
          volume: trade.volume,
          timestamp: trade.timestamp,
          wallet: trade.wallet,
          symbol: token.symbol
        });
      });
    });

    // Sort by timestamp, most recent first
    trades.sort((a, b) => b.timestamp - a.timestamp);
    setRecentTrades(trades.slice(0, 50)); // Keep last 50 trades
  }, [tokens]);

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <h3 className="font-semibold">Live Trades</h3>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {recentTrades.map((trade, i) => (
              <div 
                key={`${trade.timestamp}-${i}`} 
                className={`flex items-center justify-between p-2 rounded-lg 
                  ${trade.type === 'buy' 
                    ? 'bg-green-500/10 border-l-4 border-green-500/50' 
                    : 'bg-red-500/10 border-l-4 border-red-500/50'}`}
              >
                <div className="flex items-center gap-2">
                  {trade.type === 'buy' ? (
                    <ArrowUpCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownCircle className="w-4 h-4 text-red-500" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{trade.symbol}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {trade.wallet.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                    ${trade.volume.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${trade.price.toFixed(8)}
                  </div>
                </div>
              </div>
            ))}
            {!recentTrades.length && (
              <div className="text-center text-muted-foreground py-4">
                Waiting for trades...
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveTrades;