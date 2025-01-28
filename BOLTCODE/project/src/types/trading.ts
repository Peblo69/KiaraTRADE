// Trading related types
export interface Chain {
  id: string;
  name: string;
  icon: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  chain: Chain;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

export interface WalletBalance {
  formatted: string;
  symbol: string;
  value: bigint;
}

export interface TradeHistory {
  id: string;
  timestamp: number;
  type: 'BUY' | 'SELL';
  amount: string;
  price: string;
  total: string;
  txHash: string;
}

export interface DexInfo {
  id: string;
  name: string;
  icon: string;
  isActive: boolean;
  volume24h: number;
  tvl: number;
}