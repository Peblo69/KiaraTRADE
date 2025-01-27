import { FC } from 'react';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { Card } from "@/components/ui/card";

export const TradeHistory: FC<{ tokenAddress: string }> = ({ tokenAddress }) => {
  const trades = usePumpPortalStore(state => 
    state.getToken(tokenAddress)?.recentTrades || []
  );

  return (
    <Card className="h-[400px] overflow-y-auto bg-card rounded-lg border border-purple-500/20">
      <div className="sticky top-0 bg-card border-b border-purple-500/20 p-3">
        <h3 className="font-semibold">Recent Trades</h3>
      </div>
      
      <div className="p-2">
        <table className="w-full">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Type</th>
              <th className="text-right p-2">Price USD</th>
              <th className="text-right p-2">Amount</th>
              <th className="text-right p-2">Total USD</th>
              <th className="text-left p-2">Wallet</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => {
              const totalUsd = trade.priceInUsd * trade.tokenAmount;
              
              return (
                <tr 
                  key={trade.signature}
                  className={`text-sm border-t border-purple-500/20
                    ${trade.txType === 'buy' ? 'text-green-400' : 'text-red-400'}
                  `}
                >
                  <td className="p-2 text-muted-foreground">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-2">
                    {trade.txType.toUpperCase()}
                  </td>
                  <td className="p-2 text-right">
                    ${trade.priceInUsd.toFixed(8)}
                  </td>
                  <td className="p-2 text-right">
                    {Number(trade.tokenAmount).toLocaleString()}
                  </td>
                  <td className="p-2 text-right">
                    ${totalUsd.toFixed(2)}
                  </td>
                  <td className="p-2 font-mono text-xs">
                    <a 
                      href={`https://solscan.io/account/${trade.traderPublicKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {`${trade.traderPublicKey.slice(0,4)}...${trade.traderPublicKey.slice(-4)}`}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TradeHistory;
