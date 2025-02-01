import React from 'react';
import { BarChart2 } from 'lucide-react';
import { useTradingContext } from '../context/TradingContext';

interface Props {
  tokenAddress: string;
}

const MarketStats: React.FC<Props> = ({ tokenAddress }) => {
  const { trades, orderBook } = useTradingContext();

  // Calculate market statistics from real-time trade data
  const calculateStats = () => {
    if (!trades || trades.length === 0) {
      return {
        marketCap: 0,
        circulatingSupply: 0,
        totalSupply: 0,
        priceChange24h: 0,
        volume24h: 0,
        liquidity: 0,
        ath: 0,
        atl: 0
      };
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const tokenTrades = trades.filter(t => t.mint === tokenAddress);
    const last24hTrades = tokenTrades.filter(t => t.timestamp >= oneDayAgo);

    // Calculate 24h volume
    const volume24h = last24hTrades.reduce((sum, trade) => sum + trade.amount * trade.price, 0);

    // Calculate price change
    const currentPrice = tokenTrades[tokenTrades.length - 1]?.price || 0;
    const yesterdayPrice = tokenTrades.find(t => t.timestamp < oneDayAgo)?.price || currentPrice;
    const priceChange24h = ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100;

    // Find ATH/ATL
    const prices = tokenTrades.map(t => t.price);
    const ath = Math.max(...prices, 0);
    const atl = Math.min(...prices.filter(p => p > 0), currentPrice);

    // Calculate market cap and supply
    const totalSupply = 1000000000; // This should come from token contract
    const marketCap = totalSupply * currentPrice;

    // Calculate liquidity from order book
    const liquidity = orderBook.bids.reduce((sum, [price, size]) => sum + price * size, 0) +
                     orderBook.asks.reduce((sum, [price, size]) => sum + price * size, 0);

    return {
      marketCap,
      circulatingSupply: totalSupply,
      totalSupply,
      priceChange24h,
      volume24h,
      liquidity,
      ath,
      atl
    };
  };

  const stats = calculateStats();

  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Market Stats</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Market Cap</span>
            <span className="text-sm font-medium text-purple-100">
              ${stats.marketCap.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Circulating Supply</span>
            <span className="text-sm font-medium text-purple-100">
              {stats.circulatingSupply.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Total Supply</span>
            <span className="text-sm font-medium text-purple-100">
              {stats.totalSupply.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Price Change (24h)</span>
            <span className={`text-sm font-medium ${
              stats.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {stats.priceChange24h.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Volume (24h)</span>
            <span className="text-sm font-medium text-purple-100">
              ${stats.volume24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">Liquidity</span>
            <span className="text-sm font-medium text-purple-100">
              ${stats.liquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">ATH</span>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-100">
                ${stats.ath.toFixed(8)}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-purple-300">ATL</span>
            <div className="text-right">
              <div className="text-sm font-medium text-purple-100">
                ${stats.atl.toFixed(8)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketStats;