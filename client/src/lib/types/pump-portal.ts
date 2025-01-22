export interface PumpPortalToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  imageLink?: string;
  price: number;
  previousPrice: number;
  marketCap: number;
  previousMarketCap: number;
  liquidity: number;
  previousLiquidity: number;
  volume: number;
  volume24h: number;
  trades24h: number;
  buys24h: number;
  sells24h: number;
  walletCount: number;
  recentTrades: Array<{
    timestamp: number;
    wallet: string;
    volume: number;
    isBuy: boolean;
  }>;
  timeWindows: {
    [key: string]: {
      volume: number;
      openPrice: number;
      closePrice: number;
      highPrice: number;
      lowPrice: number;
      candles: Array<{
        timestamp: number;
        openPrice: number;
        closePrice: number;
        highPrice: number;
        lowPrice: number;
        volume: number;
      }>;
    };
  };
}
