import { FC } from "react";

const mockMarketData = {
  total_coins: 16659,
  total_exchanges: 1202,
  market_cap: {
    value: 3.51e12, // $3.51T
    change_24h: 4.6
  },
  volume_24h: 153.46e9, // $153.46B
  btc_dominance: 54.7,
  eth_dominance: 11.1,
  gas_price: 6.5
};

const MarketDataBar: FC = () => {
  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="w-full bg-black/50 backdrop-blur-sm border-b border-purple-800/20 py-1">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-8 text-sm">
          <div className="text-gray-400">
            Coins: <span className="text-white">{mockMarketData.total_coins.toLocaleString()}</span>
          </div>
          <div className="text-gray-400">
            Exchanges: <span className="text-white">{mockMarketData.total_exchanges.toLocaleString()}</span>
          </div>
          <div className="text-gray-400">
            Market Cap:{" "}
            <span className={`${mockMarketData.market_cap.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatNumber(mockMarketData.market_cap.value)}{" "}
              {mockMarketData.market_cap.change_24h >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(mockMarketData.market_cap.change_24h).toFixed(1)}%
            </span>
          </div>
          <div className="text-gray-400">
            24h Vol: <span className="text-white">{formatNumber(mockMarketData.volume_24h)}</span>
          </div>
          <div className="text-gray-400">
            BTC: <span className="text-white">{mockMarketData.btc_dominance.toFixed(1)}%</span>
          </div>
          <div className="text-gray-400">
            ETH: <span className="text-white">{mockMarketData.eth_dominance.toFixed(1)}%</span>
          </div>
          <div className="text-gray-400">
            Gas: <span className="text-white">{mockMarketData.gas_price.toFixed(1)} GWEI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDataBar;