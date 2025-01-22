import { FC, useState } from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowUpIcon, ArrowDownIcon, Search } from "lucide-react";
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
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import AdvancedChart from '@/components/AdvancedChart';
import CryptoIcon from "@/components/CryptoIcon";
import { preloadTokenImages } from "@/lib/token-metadata";


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
const MAX_VISIBLE_PAGES = 5;

const ProjectPage: FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const { data: marketData, isLoading: isLoadingMarket } = useQuery<{ data: { ticker: KuCoinTicker[] } }>({
    queryKey: ['/api/coins/markets'],
    refetchInterval: 10000,
    onSettled: async (data) => {
      if (data) {
        const symbols = data.data.ticker
          .filter(t => t.symbol.endsWith('-USDT'))
          .map(t => t.symbol);
        await preloadTokenImages(symbols);
      }
    },
    onError: (error: Error) => {
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
    onError: (error: Error) => {
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

  const getIconUrl = (symbol: string) => {
    const cleanSymbol = symbol.replace('-USDT', '').toLowerCase();
    return `https://assets.staticimg.com/cms/media/1vCIT3bTK0tCY6jLsS0SY8uVGtBGHYFCyGmGGpWLj.svg`;
  };

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setTimeout(() => setSelectedSymbol(null), 300);
  };

  const getPaginationRange = (totalPages: number, currentPage: number) => {
    if (totalPages <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSide = Math.floor(MAX_VISIBLE_PAGES / 2);
    const rightSide = totalPages - leftSide;

    if (currentPage <= leftSide) {
      return [...Array.from({ length: MAX_VISIBLE_PAGES - 1 }, (_, i) => i + 1), '...', totalPages];
    }

    if (currentPage >= rightSide) {
      return [1, '...', ...Array.from({ length: MAX_VISIBLE_PAGES - 1 }, (_, i) => totalPages - (MAX_VISIBLE_PAGES - 2) + i)];
    }

    return [
      1,
      '...',
      currentPage - 1,
      currentPage,
      currentPage + 1,
      '...',
      totalPages
    ];
  };

  if (isLoadingMarket) {
    return (
      <div className="bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const tickers = marketData?.data.ticker.filter(t => t.symbol.endsWith('-USDT')) || [];

  const sortedByVolume = [...tickers].sort((a, b) => parseFloat(b.volValue) - parseFloat(a.volValue));
  const topGainers = [...tickers]
    .sort((a, b) => parseFloat(b.changeRate) - parseFloat(a.changeRate))
    .slice(0, 5);
  const topLosers = [...tickers]
    .sort((a, b) => parseFloat(a.changeRate) - parseFloat(b.changeRate))
    .slice(0, 5);

  const trendingTokens = sortedByVolume.slice(0, 5);

  const filteredTickers = sortedByVolume.filter(ticker =>
    ticker.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTickers.length / ITEMS_PER_PAGE);
  const paginatedTickers = filteredTickers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const paginationRange = getPaginationRange(totalPages, currentPage);

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-400 transition-colors group-hover:text-purple-300" />
            <Input
              placeholder="Search coins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-purple-800/40 focus:border-purple-600/60 transition-all duration-300 backdrop-blur-sm rounded-lg shadow-[0_0_10px_rgba(147,51,234,0.1)] focus:shadow-[0_0_15px_rgba(147,51,234,0.2)] group-hover:shadow-[0_0_12px_rgba(147,51,234,0.15)] placeholder:text-purple-300/50"
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { title: "Top Gainers", icon: <ArrowUpIcon className="h-5 w-5 text-green-500" />, data: topGainers, colorClass: "text-green-500" },
            { title: "Top Losers", icon: <ArrowDownIcon className="h-5 w-5 text-red-500" />, data: topLosers, colorClass: "text-red-500" },
            { title: "Trending Now", icon: "🔥", data: trendingTokens }
          ].map((section, idx) => (
            <Card key={idx} className="p-4 border-purple-800/20 bg-background/80 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(147,51,234,0.1)] transition-all duration-300 hover:border-purple-700/30 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-blue-900/5 to-purple-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 relative">
                {section.icon}
                {section.title}
              </h3>
              <div className="space-y-3 relative">
                {section.data.map((ticker) => (
                  <div
                    key={ticker.symbol}
                    className="flex items-center justify-between p-2 rounded-lg cursor-pointer bg-background/40 hover:bg-purple-900/10 transition-all duration-300 border border-transparent hover:border-purple-700/20"
                    onClick={() => handleSymbolSelect(ticker.symbol)}
                  >
                    <div className="flex items-center gap-2">
                      <CryptoIcon symbol={ticker.symbol} size="sm" />
                      <div>
                        <div className="font-medium flex items-center gap-1">
                          {ticker.symbol.replace('-USDT', '')}
                          {parseFloat(ticker.changeRate) >= 0 ?
                            <ArrowUpIcon className="h-3 w-3 text-green-500" /> :
                            <ArrowDownIcon className="h-3 w-3 text-red-500" />
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {section.title === "Trending Now" ?
                            `Vol: ${formatVolume(ticker.volValue)}` :
                            formatPrice(ticker.last)
                          }
                        </div>
                      </div>
                    </div>
                    <div className={`min-w-[80px] text-right ${
                      parseFloat(ticker.changeRate) >= 0 ? "text-green-500" : "text-red-500"
                    }`}>
                      {formatChange(ticker.changeRate)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <Card className="border-purple-800/20 bg-background/80 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(147,51,234,0.1)] transition-all duration-300">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-purple-800/20">
                  <TableHead>Pair</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">24h Change</TableHead>
                  <TableHead className="text-right">24h Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickers.map((ticker) => (
                  <TableRow
                    key={ticker.symbol}
                    className="cursor-pointer border-b border-purple-800/10 hover:bg-purple-900/10 transition-all duration-300"
                    onClick={() => handleSymbolSelect(ticker.symbol)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={ticker.symbol} size="sm" />
                        <span className="font-medium">
                          {ticker.symbol.replace('-USDT', '')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(ticker.last)}
                    </TableCell>
                    <TableCell className={`text-right ${parseFloat(ticker.changeRate) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      <span className="flex items-center justify-end gap-1">
                        {parseFloat(ticker.changeRate) >= 0 ?
                          <ArrowUpIcon className="h-4 w-4" /> :
                          <ArrowDownIcon className="h-4 w-4" />
                        }
                        {formatChange(ticker.changeRate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatVolume(ticker.volValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="py-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={`cursor-pointer hover:bg-purple-900/10 transition-colors ${currentPage === 1 ? 'opacity-50' : ''}`}
                  />
                </PaginationItem>

                {paginationRange.map((pageNum, idx) => (
                  <PaginationItem key={idx}>
                    {pageNum === '...' ? (
                      <span className="px-4">...</span>
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(Number(pageNum))}
                        isActive={currentPage === pageNum}
                        className={`cursor-pointer transition-colors ${
                          currentPage === pageNum ?
                            'bg-purple-900/20 hover:bg-purple-900/30' :
                            'hover:bg-purple-900/10'
                        }`}
                      >
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={`cursor-pointer hover:bg-purple-900/10 transition-colors ${currentPage === totalPages ? 'opacity-50' : ''}`}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-4xl border-purple-800/20 bg-background/95 backdrop-blur-sm">
            {isLoadingCoinDetails ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : selectedCoinData ? (
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    <CryptoIcon symbol={selectedSymbol || ''} size="lg" />
                    {selectedSymbol?.replace('-USDT', '')}/USDT
                    <span className={`text-sm ${parseFloat(selectedCoinData.stats.changeRate) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatChange(selectedCoinData.stats.changeRate)}
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Last Price", value: formatPrice(selectedCoinData.stats.last) },
                    { label: "24h Volume", value: formatVolume(selectedCoinData.stats.volValue) },
                    { label: "24h High", value: formatPrice(selectedCoinData.stats.high) },
                    { label: "24h Low", value: formatPrice(selectedCoinData.stats.low) }
                  ].map((item, idx) => (
                    <Card key={idx} className="p-4 border-purple-800/20 bg-background/80 backdrop-blur-sm hover:shadow-[0_0_15px_rgba(147,51,234,0.1)] transition-all duration-300 group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-blue-900/5 to-purple-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="text-sm text-purple-300/70 relative">{item.label}</div>
                      <div className="text-lg font-bold relative">{item.value}</div>
                    </Card>
                  ))}
                </div>

                <Card className="p-4 border-purple-800/20 bg-background/80 backdrop-blur-sm">
                  <div className="h-[400px]">
                    <AdvancedChart symbol={selectedSymbol || ''} />
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