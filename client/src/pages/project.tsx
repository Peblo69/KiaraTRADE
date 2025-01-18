import { FC, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowUp, ArrowDown, Star } from "lucide-react";
import { formatDistance } from "date-fns";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import CoinChart from "@/components/CoinChart";
import { Link } from "wouter"; // Added missing import from original
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Added missing import from original
import { Info, Home, ChartPieIcon, MessagesSquare, BookOpen } from "lucide-react"; // Added missing imports from original


interface KuCoinTicker {
  symbol: string;
  symbolName: string;
  buy: string;
  sell: string;
  changeRate: string;
  changePrice: string;
  high: string;
  low: string;
  vol: string;
  volValue: string;
  last: string;
  averagePrice: string;
  time: number;
}

interface KuCoinStats {
  time: number;
  symbol: string;
  buy: string;
  sell: string;
  changeRate: string;
  changePrice: string;
  high: string;
  low: string;
  vol: string;
  volValue: string;
  last: string;
  averagePrice: string;
}

interface ChartData {
  prices: Array<[number, number]>;
}

const ProjectPage: FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: marketData, isLoading: isLoadingMarket } = useQuery<{ data: { ticker: KuCoinTicker[] } }>({
    queryKey: ['/api/coins/markets'],
    refetchInterval: 10000,
    onError: (error) => {
      console.error('Market data fetch error:', error);
      toast({
        title: "Error fetching market data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: selectedCoinData, isLoading: isLoadingCoinDetails } = useQuery<{
    stats: KuCoinStats;
    chart: ChartData;
  }>({
    queryKey: [`/api/coins/${selectedSymbol}`],
    enabled: !!selectedSymbol && dialogOpen,
    onError: (error) => {
      console.error('Coin details fetch error:', error);
      toast({
        title: "Error fetching coin details",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: numPrice < 1 ? 4 : 2,
      maximumFractionDigits: numPrice < 1 ? 6 : 2,
    }).format(numPrice);
  };

  const formatVolume = (volume: string | number) => {
    const num = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatChange = (change: string) => {
    const numChange = parseFloat(change);
    return `${numChange >= 0 ? '+' : ''}${(numChange * 100).toFixed(2)}%`;
  };

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setTimeout(() => setSelectedSymbol(null), 300);
  };

  if (isLoadingMarket) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const tickers = marketData?.data.ticker.filter(t => t.symbol.endsWith('-USDT')) || [];
  const sortedTickers = [...tickers].sort((a, b) => parseFloat(b.volValue) - parseFloat(a.volValue));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-4">
        {/* Market Overview Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Market Overview</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead className="text-right">Last Price</TableHead>
                  <TableHead className="text-right">24h Change</TableHead>
                  <TableHead className="text-right">24h High</TableHead>
                  <TableHead className="text-right">24h Low</TableHead>
                  <TableHead className="text-right">24h Volume</TableHead>
                  <TableHead className="text-right">Market Cap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTickers.map((ticker) => (
                  <TableRow
                    key={ticker.symbol}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSymbolSelect(ticker.symbol)}
                  >
                    <TableCell className="font-medium">
                      {ticker.symbol.replace('-USDT', '')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(ticker.last)}
                    </TableCell>
                    <TableCell className={`text-right ${parseFloat(ticker.changeRate) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      <span className="flex items-center justify-end gap-1">
                        {parseFloat(ticker.changeRate) >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {formatChange(ticker.changeRate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(ticker.high)}</TableCell>
                    <TableCell className="text-right">{formatPrice(ticker.low)}</TableCell>
                    <TableCell className="text-right">{formatVolume(ticker.volValue)}</TableCell>
                    <TableCell className="text-right">{formatVolume(parseFloat(ticker.vol) * parseFloat(ticker.last))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Coin Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-4xl">
            {isLoadingCoinDetails ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : selectedCoinData ? (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    {selectedSymbol?.replace('-USDT', '')}/USDT
                    <span className={`text-sm ${parseFloat(selectedCoinData.stats.changeRate) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatChange(selectedCoinData.stats.changeRate)}
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Last Price</div>
                    <div className="text-lg font-bold">{formatPrice(selectedCoinData.stats.last)}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">24h Volume</div>
                    <div className="text-lg font-bold">{formatVolume(selectedCoinData.stats.volValue)}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">24h High</div>
                    <div className="text-lg font-bold">{formatPrice(selectedCoinData.stats.high)}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">24h Low</div>
                    <div className="text-lg font-bold">{formatPrice(selectedCoinData.stats.low)}</div>
                  </Card>
                </div>

                <Card className="p-4">
                  <div className="h-[400px]">
                    {selectedCoinData.chart?.prices && (
                      <CoinChart prices={selectedCoinData.chart.prices} />
                    )}
                  </div>
                </Card>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ProjectPage;