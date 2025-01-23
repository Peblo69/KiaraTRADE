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
}

// Combined token data for display