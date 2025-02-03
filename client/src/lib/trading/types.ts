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
  asks: [number, number][]; // [price, amount]
  bids: [number, number][]; // [price, amount]
}

export interface Trade {
  id: string;
  timestamp: number;
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  priceInUsd?: number;
  priceInSol?: number;
  wallet: string;
  status: 'pending' | 'completed' | 'failed';
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
