import { useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
} from 'recharts';

interface TokenChartProps {
  tokenAddress: string;
  onBack: () => void;
}

export function TokenChart({ tokenAddress, onBack }: TokenChartProps) {
  const token = usePumpPortalStore(state => 
    state.tokens.find(t => t.address === tokenAddress)
  );

  const chartData = useMemo(() => {
    if (!token) return [];
    return token.recentTrades.map(trade => ({
      time: new Date(trade.timestamp).toLocaleTimeString(),
      price: trade.price,
      volume: trade.volume,
      type: trade.isBuy ? 'buy' : 'sell'
    })).reverse();
  }, [token?.recentTrades]);

  if (!token) return null;

  return (
    <div className="flex-1 h-screen bg-black text-white">
      <div className="absolute top-4 left-4 z-10">
        <Button 
          variant="ghost" 
          className="text-white hover:bg-white/10" 
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img 
              src={token.imageLink || '/placeholder.png'} 
              className="w-8 h-8 rounded-full"
              alt={token.symbol}
            />
            <div>
              <h2 className="text-2xl font-bold">{token.symbol}</h2>
              <div className="text-sm text-gray-400">${token.price.toFixed(8)} ETH</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-400">Market Cap</div>
              <div className="font-bold">${token.marketCap.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Liquidity</div>
              <div className="font-bold">${token.liquidity.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Volume (24h)</div>
              <div className="font-bold">${token.volume.toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Holders</div>
              <div className="font-bold">{token.walletCount || 0}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr,300px] gap-4">
          <div className="h-[500px] bg-[#111] rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#666" />
                <YAxis stroke="#666" tickFormatter={(value) => `$${value.toFixed(8)}`} />
                <Tooltip
                  contentStyle={{
                    background: '#000',
                    border: '1px solid #333',
                    borderRadius: '4px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#22c55e"
                  fill="url(#priceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <Card className="bg-[#111] border-none p-4">
              <Tabs defaultValue="market" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="market">Market</TabsTrigger>
                  <TabsTrigger value="limit">Limit</TabsTrigger>
                  <TabsTrigger value="dca">DCA</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-2">Amount</div>
                  <div className="grid grid-cols-4 gap-2">
                    <Button variant="outline" size="sm">0.01</Button>
                    <Button variant="outline" size="sm">0.02</Button>
                    <Button variant="outline" size="sm">0.5</Button>
                    <Button variant="outline" size="sm">1</Button>
                  </div>
                </div>

                <Input type="number" placeholder="Enter amount..." className="bg-black border-gray-800" />

                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-green-600 hover:bg-green-700">Buy</Button>
                  <Button variant="destructive">Sell</Button>
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700">Add Funds</Button>

                <div className="grid grid-cols-3 text-sm">
                  <div>
                    <div className="text-gray-400">Invested</div>
                    <div>$0.00</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Sold</div>
                    <div>$0.00</div>
                  </div>
                  <div>
                    <div className="text-gray-400">P/L</div>
                    <div className="text-red-500">-0%</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TokenChart;