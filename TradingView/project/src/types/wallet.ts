export interface WalletTransaction {
  id: string;
  timestamp: number;
  type: 'buy' | 'sell';
  tokenAmount: number;
  price: number;
  status: 'completed' | 'pending' | 'failed';
  hash: string;
}

export interface Token {
  symbol: string;
  amount: number;
  price: number;
  value: number;
  change24h: number;
}

export interface WalletDetails {
  address: string;
  isActive: boolean;
  lastTransaction: number;
  totalValue: number;
  tokens: Token[];
  transactions: WalletTransaction[];
  pnl: {
    total: number;
    percentage: number;
    change24h: number;
  };
  liquidity: number;
}

export interface WalletState {
  selectedWallet: string | null;
  wallets: Record<string, WalletDetails>;
  isWalletModalOpen: boolean;
}