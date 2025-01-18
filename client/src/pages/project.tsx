import { FC } from "react";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface GlobalData {
  data: {
    active_cryptocurrencies: number;
    markets: number;
    total_market_cap: {
      usd: number;
    };
    market_cap_change_percentage_24h_usd: number;
    total_volume: {
      usd: number;
    };
    market_cap_percentage: {
      btc: number;
      eth: number;
    };
  };
}

const ProjectPage: FC = () => {
  const { data, isLoading } = useQuery<GlobalData>({
    queryKey: ['/api/global-metrics'],
    refetchInterval: 60000, // Refresh every minute
  });

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto p-4">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <header className="space-y-4">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
              Market Intelligence
            </h1>
            <p className="text-2xl text-purple-400/80">
              Powered by KIARA AI Analytics
            </p>
          </header>

          {isLoading ? (
            <Card className="p-8 bg-black/40 backdrop-blur-sm border-purple-500/20">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                <span className="text-purple-400">Loading market data...</span>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="p-6 bg-black/40 backdrop-blur-sm border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <div className="space-y-2">
                  <h3 className="text-lg text-purple-400">Total Cryptocurrencies</h3>
                  <p className="text-3xl font-bold text-white">
                    {data?.data.active_cryptocurrencies.toLocaleString()}
                  </p>
                  <p className="text-sm text-purple-400/60">Active Digital Assets</p>
                </div>
              </Card>

              <Card className="p-6 bg-black/40 backdrop-blur-sm border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <div className="space-y-2">
                  <h3 className="text-lg text-purple-400">Global Market Cap</h3>
                  <p className="text-3xl font-bold text-white">
                    {formatNumber(data?.data.total_market_cap.usd || 0)}
                  </p>
                  <p className={`text-sm ${data?.data.market_cap_change_percentage_24h_usd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data?.data.market_cap_change_percentage_24h_usd >= 0 ? '↑' : '↓'} {Math.abs(data?.data.market_cap_change_percentage_24h_usd || 0).toFixed(2)}% (24h)
                  </p>
                </div>
              </Card>

              <Card className="p-6 bg-black/40 backdrop-blur-sm border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <div className="space-y-2">
                  <h3 className="text-lg text-purple-400">24h Trading Volume</h3>
                  <p className="text-3xl font-bold text-white">
                    {formatNumber(data?.data.total_volume.usd || 0)}
                  </p>
                  <p className="text-sm text-purple-400/60">Global Volume</p>
                </div>
              </Card>

              <Card className="p-6 bg-black/40 backdrop-blur-sm border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <div className="space-y-2">
                  <h3 className="text-lg text-purple-400">Active Markets</h3>
                  <p className="text-3xl font-bold text-white">
                    {data?.data.markets.toLocaleString()}
                  </p>
                  <p className="text-sm text-purple-400/60">Trading Venues</p>
                </div>
              </Card>

              <Card className="p-6 bg-black/40 backdrop-blur-sm border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <div className="space-y-2">
                  <h3 className="text-lg text-purple-400">Bitcoin Dominance</h3>
                  <p className="text-3xl font-bold text-white">
                    {data?.data.market_cap_percentage.btc.toFixed(2)}%
                  </p>
                  <p className="text-sm text-purple-400/60">Market Share</p>
                </div>
              </Card>

              <Card className="p-6 bg-black/40 backdrop-blur-sm border-purple-500/20 hover:border-purple-500/40 transition-colors">
                <div className="space-y-2">
                  <h3 className="text-lg text-purple-400">Ethereum Dominance</h3>
                  <p className="text-3xl font-bold text-white">
                    {data?.data.market_cap_percentage.eth.toFixed(2)}%
                  </p>
                  <p className="text-sm text-purple-400/60">Market Share</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectPage;