export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  priceInUsd?: number;
  marketCapSol?: number;
  solPrice?: number;
  vSolInBondingCurve?: number;
  metadata?: {
    name: string;
    symbol: string;
    uri?: string;
    imageUrl?: string;
  };
  imageUrl?: string;
  recentTrades?: {
    age: string;
    type: 'B' | 'S';
    price: string;
    total: string;
    maker: string;
  }[];
  isNew?: boolean;
}
