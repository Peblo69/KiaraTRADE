// Token related types for the application
export interface TokenData {
  id: string;           // Unique token identifier
  name: string;         // Token name
  fullName?: string;    // Optional full name/description
  time: string;         // Time since creation/last update
  price: number;        // Current token price
  marketCap: number;    // Market capitalization
  volume: number;       // Trading volume
  stats: {
    holders: string;    // Percentage of holders
    buys: string;      // Percentage of buys
  };
  metrics?: {
    circulatingSupply: {
      value: number;
      percentage: number;
    };
    totalSupply: number;
    tvl: number;        // Total Value Locked
    holders: number;    // Number of holders
  };
}

export interface Trade {
  id: string;           // Unique trade identifier
  age: string;          // Time since trade
  type: 'B' | 'S';      // Buy or Sell
  marketCap: string;    // Market cap at time of trade
  amount: string;       // Trade amount
  total: string;        // Total value in USD
  maker: string;        // Maker address/identifier
}

export interface AutoSellSettings {
  stopLoss: string;     // Stop loss percentage
  takeProfit: string;   // Take profit percentage
  trailingStop: string; // Trailing stop percentage
}