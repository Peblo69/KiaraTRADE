import { FC } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAddress, formatNumber } from "@/lib/utils";
import { useTokenAnalyticsStore } from "@/lib/token-analytics-websocket";

interface TokenCardProps {
  token: any;
  onClick: () => void;
}

export const TokenCard: FC<TokenCardProps> = ({ token, onClick }) => {
  const analytics = useTokenAnalyticsStore(state => state.analytics[token.address]);
  const rugCheck = useTokenAnalyticsStore(state => state.rugCheck[token.address]);
  
  const formatPrice = (price: number) => {
    if (!price) return '$0.00';
    return price < 0.01 ? price.toExponential(4) : price.toFixed(4);
  };

  const getRugRiskEmoji = (risk: string) => {
    switch(risk) {
      case 'low': return '✅';
      case 'medium': return '⚠️';
      case 'high': return '🚨';
      default: return '❓';
    }
  };

  const getTrendEmoji = (trades: any[]) => {
    if (!trades || trades.length < 2) return '➡️';
    const lastTrade = trades[0]?.price || 0;
    const prevTrade = trades[1]?.price || 0;
    return lastTrade > prevTrade ? '📈' : lastTrade < prevTrade ? '📉' : '➡️';
  };

  const getLiquidityEmoji = (liquidity: number) => {
    return liquidity > 100000 ? '💰' : liquidity > 10000 ? '💵' : '💸';
  };

  const rugRiskColor = !rugCheck ? 'gray' : 
    rugCheck?.score > 75 ? 'red' : 
    rugCheck?.score > 40 ? 'yellow' : 'green';


  return (
    <Card 
      className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
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
                {token.symbol} {getTrendEmoji(token.recentTrades)}
              </div>
              <div className="text-sm text-muted-foreground">
                {token.name}
              </div>
            </div>
          </div>
          {analytics?.analytics.rugPullRisk && (
            <Badge variant={analytics.analytics.rugPullRisk === 'low' ? 'success' : 
                          analytics.analytics.rugPullRisk === 'medium' ? 'warning' : 'destructive'}>
              {getRugRiskEmoji(analytics.analytics.rugPullRisk)} {analytics.analytics.rugPullRisk.toUpperCase()}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2 bg-black/10 p-2 rounded-lg">
              <span className="text-xs text-purple-400">Last Trade: </span>
              <span className="text-xs">{token.recentTrades?.[0]?.timestamp ? new Date(token.recentTrades[0].timestamp).toLocaleTimeString() : 'No trades'}</span>
            </div>
            
            {analytics && (
              <div className="col-span-2 mt-2 space-y-2">
                <div className="text-sm font-medium">Analytics:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Mint Authority: {analytics.mintAuthority || 'Unknown'}</div>
                  <div>Freeze Authority: {analytics.freezeAuthority || 'Unknown'}</div>
                </div>
              </div>
            )}

            {rugCheck && (
              <div className="col-span-2 mt-2 space-y-2">
                <div className="text-sm font-medium">Rug Risk Analysis:</div>
                <div className="text-xs space-y-1">
                  <div>Score: {rugCheck.score}%</div>
                  {rugCheck.risks?.map((risk, i) => (
                    <div key={i} className={`text-${risk.level === 'high' ? 'red' : risk.level === 'medium' ? 'yellow' : 'green'}-400`}>
                      {risk.name}: {risk.value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          <div>
            <div className="text-sm text-muted-foreground">💎 Price</div>
            <div className="font-medium">${formatNumber(token.price)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">📊 Market Cap</div>
            <div className="font-medium">${formatNumber(token.marketCap)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">
              {getLiquidityEmoji(token.liquidity)} Liquidity
            </div>
            <div className="font-medium">${formatNumber(token.liquidity)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">📈 Volume (24h)</div>
            <div className="font-medium">${formatNumber(token.volume)}</div>
          </div>
        </div>

        {analytics && (
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className="text-muted-foreground">🎯 Snipers: </span>
                <span className="font-medium">{analytics.snipers.length}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">👥 Holders: </span>
                <span className="font-medium">{analytics.analytics.totalHolders}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">🔄 Trades: </span>
                <span className="font-medium">{token.recentTrades?.length || 0}</span>
              </div>
            </div>
          </div>
        )}

        {rugCheck && (
          <div className={`rug-risk ${rugRiskColor}`}>
            <span>Rug Risk: {rugCheck.score}%</span>
            {rugCheck.mintAuthority && <div>Mint Authority: {rugCheck.mintAuthority}</div>}
            {rugCheck.freezeAuthority && <div>Freeze Authority: {rugCheck.freezeAuthority}</div>}
            {rugCheck.risks && rugCheck.risks.map((risk, i) => (
              <div key={i} className={`risk-item ${risk.level}`}>
                {risk.name}: {risk.value}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};