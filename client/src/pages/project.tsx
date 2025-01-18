import { FC, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowUp, ArrowDown, Search } from "lucide-react";
import { formatDistance } from "date-fns";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import CoinChart from "@/components/CoinChart";

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

const ITEMS_PER_PAGE = 20;

const ProjectPage: FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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

  // Sort by volume and get top gainers/losers
  const sortedByVolume = [...tickers].sort((a, b) => parseFloat(b.volValue) - parseFloat(a.volValue));
  const topGainers = [...tickers]
    .sort((a, b) => parseFloat(b.changeRate) - parseFloat(a.changeRate))
    .slice(0, 5);
  const topLosers = [...tickers]
    .sort((a, b) => parseFloat(a.changeRate) - parseFloat(b.changeRate))
    .slice(0, 5);

  // Filter by search query
  const filteredTickers = sortedByVolume.filter(ticker => 
    ticker.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginate results
  const totalPages = Math.ceil(filteredTickers.length / ITEMS_PER_PAGE);
  const paginatedTickers = filteredTickers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-4 space-y-6">
        {/* Search Bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search coins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Market Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Top Gainers */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ArrowUp className="h-5 w-5 text-green-500" />
              Top Gainers
            </h3>
            <div className="space-y-3">
              {topGainers.map((ticker) => (
                <div
                  key={ticker.symbol}
                  className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                  onClick={() => handleSymbolSelect(ticker.symbol)}
                >
                  <div>
                    <div className="font-medium">{ticker.symbol.replace('-USDT', '')}</div>
                    <div className="text-sm text-muted-foreground">{formatPrice(ticker.last)}</div>
                  </div>
                  <div className="text-green-500">{formatChange(ticker.changeRate)}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Losers */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-red-500" />
              Top Losers
            </h3>
            <div className="space-y-3">
              {topLosers.map((ticker) => (
                <div
                  key={ticker.symbol}
                  className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg cursor-pointer"
                  onClick={() => handleSymbolSelect(ticker.symbol)}
                >
                  <div>
                    <div className="font-medium">{ticker.symbol.replace('-USDT', '')}</div>
                    <div className="text-sm text-muted-foreground">{formatPrice(ticker.last)}</div>
                  </div>
                  <div className="text-red-500">{formatChange(ticker.changeRate)}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Market Stats */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Market Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Pairs</span>
                <span className="font-medium">{tickers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24h Volume</span>
                <span className="font-medium">
                  {formatVolume(tickers.reduce((sum, t) => sum + parseFloat(t.volValue), 0))}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Market Table */}
        <Card>
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
                {paginatedTickers.map((ticker) => (
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

          {/* Pagination */}
          <div className="py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="cursor-pointer"
                  />
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i + 1}>
                    <PaginationLink
                      onClick={() => setCurrentPage(i + 1)}
                      isActive={currentPage === i + 1}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="cursor-pointer"
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </Card>

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