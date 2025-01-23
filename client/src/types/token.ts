// Token interfaces used across the application

// Base token info from PumpPortal
export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  imageLink?: string;
  isActive: boolean;
  isVisible: boolean;
  lastTradeTime: number;
  metrics?: TokenMetrics;
}

// Trade info from Helius
export interface TokenTrade {
  signature: string;
  timestamp: number;
  price: number;
  priceUSD: number;
  volume: number;
  isBuy: boolean;
  wallet: string;
  priceImpact: number;
  supply?: number;
  liquidity?: number;
  buyer?: string;
  seller?: string;
}

// Time window metrics
export interface TimeWindow {
  startTime: number;
  endTime: number;
  openPrice: number;
  closePrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  trades: number;
  buys: number;
  sells: number;
}

// Token metrics from Helius
export interface TokenMetrics {
  price: number;
  priceUSD: number;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  trades24h: number;
  buys24h: number;
  sells24h: number;
  walletCount: number;
  holders: Set<string>;
  whales: Set<string>;
  smartMoneyWallets: Set<string>;
  priceHistory: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  timeWindows: {
    '1m': TimeWindow;
    '5m': TimeWindow;
    '15m': TimeWindow;
    '1h': TimeWindow;
  };
  recentTrades: TokenTrade[];
}