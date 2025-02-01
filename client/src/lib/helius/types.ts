export interface HeliusTokenTransaction {
  signature: string;
  timestamp: number;
  type: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  fee: number;
  feePayer: string;
  accountData: {
    account: string;
    preBalance: number;
    postBalance: number;
  }[];
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  creators: string[];
  mint: string;
  decimals: number;
  imageUrl: string;
}
