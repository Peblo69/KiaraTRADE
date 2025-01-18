import { FC, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowUp, ArrowDown, TrendingUp, Info } from "lucide-react";
import { formatDistance } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CoinChart from "@/components/CoinChart";

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  sparkline_in_7d: { price: number[] };
  last_updated: string;
  circulating_supply: number;
  total_supply: number;
}

interface CoinDetails {
  id: string;
  symbol: string;
  name: string;
  description: { en: string };
  market_data: {
    current_price: { usd: number };
    ath: { usd: number };
    atl: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    high_24h: { usd: number };
    low_24h: { usd: number };
  };
  market_chart: {
    prices: Array<[number, number]>;
  };
  links: {
    homepage: string[];
    blockchain_site: string[];
    official_forum_url: string[];
    chat_url: string[];
    twitter_screen_name: string;
    telegram_channel_identifier: string;
  };
}

const ProjectPage: FC = () => {
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);

  const { data: marketData, isLoading: isLoadingMarket } = useQuery<Coin[]>({
    queryKey: ['/api/coins/markets'],
    refetchInterval: 30000,
  });

  const { data: selectedCoinData, isLoading: isLoadingCoinDetails } = useQuery<CoinDetails>({
    queryKey: [`/api/coins/${selectedCoin}`],
    enabled: !!selectedCoin,
  });

  const { data: trendingData, isLoading: isLoadingTrending } = useQuery<{ coins: Array<{ item: any }> }>({
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

  const formatSupply = (supply: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(supply);
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

  const coins = marketData || [];
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
                <Card 
                  key={item.id} 
                  className="bg-black/40 backdrop-blur-sm border-purple-500/20 p-4 hover:border-purple-500/40 transition-all cursor-pointer"
                  onClick={() => setSelectedCoin(item.id)}
                >
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
                    <th className="pb-4">1h %</th>
                    <th className="pb-4">24h %</th>
                    <th className="pb-4">7d %</th>
                    <th className="pb-4">24h Volume</th>
                    <th className="pb-4">Market Cap</th>
                    <th className="pb-4">Circulating Supply</th>
                    <th className="pb-4">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {coins.slice(0, 10).map((coin) => (
                    <tr 
                      key={coin.id} 
                      className="border-b border-purple-500/10 hover:bg-purple-500/5 cursor-pointer" 
                      onClick={() => setSelectedCoin(coin.id)}
                    >
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
                        <span className={`flex items-center gap-1 ${coin.price_change_percentage_1h_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {coin.price_change_percentage_1h_in_currency >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                          {Math.abs(coin.price_change_percentage_1h_in_currency).toFixed(2)}%
                        </span>
                      </td>
                      <td>
                        <span className={`flex items-center gap-1 ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {coin.price_change_percentage_24h >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                          {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </span>
                      </td>
                      <td>
                        <span className={`flex items-center gap-1 ${coin.price_change_percentage_7d_in_currency >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {coin.price_change_percentage_7d_in_currency >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                          {Math.abs(coin.price_change_percentage_7d_in_currency).toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-white">{formatMarketCap(coin.total_volume)}</td>
                      <td className="text-white">{formatMarketCap(coin.market_cap)}</td>
                      <td className="text-white">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1">
                                {formatSupply(coin.circulating_supply)}
                                <Info className="h-4 w-4 text-purple-400" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Total Supply: {coin.total_supply ? formatSupply(coin.total_supply) : 'N/A'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
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
                  <Card 
                    key={coin.id} 
                    className="bg-black/40 backdrop-blur-sm border-purple-500/20 p-4 cursor-pointer hover:border-purple-500/40"
                    onClick={() => setSelectedCoin(coin.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={coin.image} alt={coin.name} className="w-8 h-8" />
                        <div>
                          <h3 className="font-medium text-white">{coin.name}</h3>
                          <p className="text-sm text-purple-400">{coin.symbol.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white">{formatPrice(coin.current_price)}</div>
                        <div className="text-green-400 flex items-center gap-1">
                          <ArrowUp className="h-4 w-4" />
                          {coin.price_change_percentage_24h.toFixed(2)}%
                        </div>
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
                  <Card 
                    key={coin.id} 
                    className="bg-black/40 backdrop-blur-sm border-purple-500/20 p-4 cursor-pointer hover:border-purple-500/40"
                    onClick={() => setSelectedCoin(coin.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={coin.image} alt={coin.name} className="w-8 h-8" />
                        <div>
                          <h3 className="font-medium text-white">{coin.name}</h3>
                          <p className="text-sm text-purple-400">{coin.symbol.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white">{formatPrice(coin.current_price)}</div>
                        <div className="text-red-400 flex items-center gap-1">
                          <ArrowDown className="h-4 w-4" />
                          {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Coin Details Dialog */}
      <Dialog open={!!selectedCoin} onOpenChange={() => setSelectedCoin(null)}>
        <DialogContent className="bg-black/90 border-purple-500/20 text-white max-w-4xl">
          {isLoadingCoinDetails ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : selectedCoinData ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <img 
                    src={coins.find(c => c.id === selectedCoin)?.image} 
                    alt={selectedCoinData.name} 
                    className="w-8 h-8"
                  />
                  {selectedCoinData.name}
                  <span className="text-sm text-purple-400">
                    ({selectedCoinData.symbol.toUpperCase()})
                  </span>
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {selectedCoinData.description.en.split('. ')[0]}.
                </DialogDescription>
              </DialogHeader>

              {/* Price Chart */}
              <div className="mt-4 mb-6">
                {selectedCoinData.market_chart?.prices && (
                  <CoinChart prices={selectedCoinData.market_chart.prices} />
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm text-purple-400">Price</h3>
                    <p className="text-xl font-bold">
                      {formatPrice(selectedCoinData.market_data.current_price.usd)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm text-purple-400">Market Cap</h3>
                    <p className="text-xl font-bold">
                      {formatMarketCap(selectedCoinData.market_data.market_cap.usd)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm text-purple-400">24h High</h3>
                    <p className="text-green-400">
                      {formatPrice(selectedCoinData.market_data.high_24h.usd)}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm text-purple-400">24h Low</h3>
                    <p className="text-red-400">
                      {formatPrice(selectedCoinData.market_data.low_24h.usd)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-purple-400 mb-2">Links</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCoinData.links.homepage[0] && (
                      <a
                        href={selectedCoinData.links.homepage[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm bg-purple-500/20 hover:bg-purple-500/30 px-3 py-1 rounded-full"
                      >
                        Website
                      </a>
                    )}
                    {selectedCoinData.links.blockchain_site[0] && (
                      <a
                        href={selectedCoinData.links.blockchain_site[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm bg-purple-500/20 hover:bg-purple-500/30 px-3 py-1 rounded-full"
                      >
                        Explorer
                      </a>
                    )}
                    {selectedCoinData.links.twitter_screen_name && (
                      <a
                        href={`https://twitter.com/${selectedCoinData.links.twitter_screen_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm bg-purple-500/20 hover:bg-purple-500/30 px-3 py-1 rounded-full"
                      >
                        Twitter
                      </a>
                    )}
                    {selectedCoinData.links.telegram_channel_identifier && (
                      <a
                        href={`https://t.me/${selectedCoinData.links.telegram_channel_identifier}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm bg-purple-500/20 hover:bg-purple-500/30 px-3 py-1 rounded-full"
                      >
                        Telegram
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectPage;