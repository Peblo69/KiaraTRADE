import { FC, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { ArrowLeft } from "lucide-react";
import { createChart } from 'lightweight-charts';
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface TokenChartProps {
  tokenAddress: string;
  onBack: () => void;
}

const TokenChart: FC<TokenChartProps> = ({ tokenAddress, onBack }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const token = usePumpPortalStore(state => 
    state.tokens.find(t => t.address === tokenAddress)
  );

  useEffect(() => {
    if (!chartContainerRef.current || !token?.recentTrades) return;

    // Convert trades to chart data with unique timestamps
    const trades = token.recentTrades
      .map((trade, index) => ({
        time: Math.floor(trade.timestamp / 1000) + index, // Add index to ensure unique timestamps
        value: trade.solAmount / trade.tokenAmount,
      }))
      .filter(trade => !isNaN(trade.value) && trade.value > 0)
      .sort((a, b) => a.time - b.time);

    if (trades.length === 0) return; // Don't create chart without data

    if (trades.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#000000' },
        textColor: '#666666',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#333333',
      },
    });

    const lineSeries = chart.addLineSeries({
      color: '#22c55e',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 9,
        minMove: 0.000000001,
      },
    });

    lineSeries.setData(trades);

    // Set visible range
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      chart.remove();
      resizeObserver.disconnect();
    };
  }, [token?.recentTrades]);

  if (!token) return null;

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatSolAmount = (amount: number) => {
    if (!amount || isNaN(amount)) return '0 SOL';
    return `${amount.toFixed(9)} SOL`;
  };

  const formatTokenAmount = (amount: number) => {
    if (!amount || isNaN(amount)) return '0';
    return amount.toLocaleString(undefined, {maximumFractionDigits: 9});
  };

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
              src={token.imageLink || 'https://via.placeholder.com/150'} 
              className="w-8 h-8 rounded-full"
              alt={token.symbol}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
              }}
            />
            <div>
              <h2 className="text-2xl font-bold">{token.symbol}</h2>
              <div className="text-sm text-gray-400">
                {formatAddress(token.address)}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-400">SOL in Pool</div>
              <div className="font-bold">{formatSolAmount(token.vSolInBondingCurve)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Market Cap SOL</div>
              <div className="font-bold">{formatSolAmount(token.marketCapSol)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr,300px] gap-4">
          <ResizablePanelGroup direction="vertical" className="h-[700px]">
            <ResizablePanel defaultSize={60} minSize={40}>
              <div className="h-full bg-[#111] rounded-lg p-4">
                <div ref={chartContainerRef} className="h-full w-full" />
              </div>
            </ResizablePanel>
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="h-full bg-[#111] rounded-lg p-4 overflow-hidden">
                <h3 className="text-sm font-semibold mb-2">Recent Trades</h3>
                <div className="space-y-2 overflow-y-auto h-[calc(100%-2rem)]">
                  {token.recentTrades?.map((trade, idx) => (
                    <div
                      key={trade.signature || idx}
                      className={`flex items-center justify-between p-2 rounded bg-black/20 text-sm ${
                        trade.txType === 'buy' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{formatTimestamp(trade.timestamp)}</span>
                        <span>
                          {formatAddress(trade.txType === 'buy' ? trade.traderPublicKey : trade.counterpartyPublicKey)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div>{formatSolAmount(trade.solAmount)}</div>
                        <div className="text-xs text-gray-500">
                          {formatTokenAmount(trade.tokenAmount)} tokens
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

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
                  <div className="text-sm text-gray-400 mb-2">Amount (SOL)</div>
                  <div className="grid grid-cols-4 gap-2">
                    <Button variant="outline" size="sm">0.01</Button>
                    <Button variant="outline" size="sm">0.02</Button>
                    <Button variant="outline" size="sm">0.5</Button>
                    <Button variant="outline" size="sm">1</Button>
                  </div>
                </div>

                <Input type="number" placeholder="Enter SOL amount..." className="bg-black border-gray-800" />

                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-green-600 hover:bg-green-700">Buy</Button>
                  <Button variant="destructive">Sell</Button>
                </div>

                <Button className="w-full bg-blue-600 hover:bg-blue-700">Add Funds</Button>

                <div className="grid grid-cols-2 text-sm">
                  <div>
                    <div className="text-gray-400">Tokens in Pool</div>
                    <div>{formatTokenAmount(token.vTokensInBondingCurve)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">SOL in Pool</div>
                    <div>{formatSolAmount(token.vSolInBondingCurve)}</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenChart;