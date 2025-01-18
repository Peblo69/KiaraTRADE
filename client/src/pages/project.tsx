import { FC } from "react";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { formatDistance } from "date-fns";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  sparkline_in_7d: { price: number[] };
  last_updated: string;
}

interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    small: string;
    price_btc: number;
    score: number;
  };
}

const ProjectPage: FC = () => {
  const { data: marketData, isLoading: isLoadingMarket } = useQuery<{ data: Coin[] }>({
    queryKey: ['/api/coins/markets'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: trendingData, isLoading: isLoadingTrending } = useQuery<{ coins: TrendingCoin[] }>({
    queryKey: ['/api/trending'],
    refetchInterval: 30000,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price);
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

  if (isLoadingMarket || isLoadingTrending) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        </div>
      </div>
    );
  }

  const coins = marketData?.data || [];
  const trending = trendingData?.coins || [];
  const gainers = [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 5);
  const losers = [...coins].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 5);

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto p-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Trending Section */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-purple-400" />
              Trending
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {trending.map(({ item }) => (
                <Card key={item.id} className="bg-black/40 backdrop-blur-sm border-purple-500/20 p-4 hover:border-purple-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={item.small} alt={item.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <h3 className="font-medium text-white">{item.name}</h3>
                      <p className="text-sm text-purple-400">{item.symbol.toUpperCase()}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Market Leaders Table */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Top Cryptocurrencies</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-purple-400 border-b border-purple-500/20">
                    <th className="pb-4 pl-4">#</th>
                    <th className="pb-4">Name</th>
                    <th className="pb-4">Price</th>
                    <th className="pb-4">24h %</th>
                    <th className="pb-4">Market Cap</th>
                    <th className="pb-4">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {coins.slice(0, 10).map((coin) => (
                    <tr key={coin.id} className="border-b border-purple-500/10 hover:bg-purple-500/5">
                      <td className="py-4 pl-4 text-gray-400">{coin.market_cap_rank}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <img src={coin.image} alt={coin.name} className="w-6 h-6" />
                          <div>
                            <div className="font-medium text-white">{coin.name}</div>
                            <div className="text-sm text-purple-400">{coin.symbol.toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-white">{formatPrice(coin.current_price)}</td>
                      <td>
                        <span className={`flex items-center gap-1 ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {coin.price_change_percentage_24h >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                          {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-white">{formatMarketCap(coin.market_cap)}</td>
                      <td className="text-gray-400">
                        {formatDistance(new Date(coin.last_updated), new Date(), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Gainers & Losers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top Gainers */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Top Gainers (24h)</h2>
              <div className="space-y-4">
                {gainers.map((coin) => (
                  <Card key={coin.id} className="bg-black/40 backdrop-blur-sm border-purple-500/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={coin.image} alt={coin.name} className="w-8 h-8" />
                        <div>
                          <h3 className="font-medium text-white">{coin.name}</h3>
                          <p className="text-sm text-purple-400">{coin.symbol.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-green-400 flex items-center gap-1">
                        <ArrowUp className="h-4 w-4" />
                        {coin.price_change_percentage_24h.toFixed(2)}%
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* Top Losers */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Top Losers (24h)</h2>
              <div className="space-y-4">
                {losers.map((coin) => (
                  <Card key={coin.id} className="bg-black/40 backdrop-blur-sm border-purple-500/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={coin.image} alt={coin.name} className="w-8 h-8" />
                        <div>
                          <h3 className="font-medium text-white">{coin.name}</h3>
                          <p className="text-sm text-purple-400">{coin.symbol.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-red-400 flex items-center gap-1">
                        <ArrowDown className="h-4 w-4" />
                        {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPage;