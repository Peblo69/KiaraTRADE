export interface TradingPair {
  baseAsset: string;
  quoteAsset: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export interface OrderBook {
  bids: [number, number][]; // [price, amount]
  asks: [number, number][]; // [price, amount]
}

export interface Trade {
  id: string;
  price: number;
  amount: number;
  amountUSD: number;
  amountSOL: number;
  side: 'buy' | 'sell';
  timestamp: number;
  wallet: string;
  maker: boolean;
  fee: number;
}

export interface UserBalance {
  asset: string;
  free: number;
  locked: number;
}

export interface OrderFormData {
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
}