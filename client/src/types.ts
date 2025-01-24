
// Helius WebSocket Types
export interface HeliusData {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: string;
  initialBuy: number;
  bondingCurveKey: string;
  marketCapSol: number;
  name: string;
  pool: string;
  solAmount: number;
  symbol: string;
  uri: string;
  vSolInBondingCurve: number;
  vTokensInBondingCurve: number;
  imageLink?: string;
  timestamp?: number;
  decimals?: number;
}

export interface HeliusWebSocketMessage {
  jsonrpc: '2.0';
  method: 'accountNotification';
  params: {
    result: {
      accountId: string;
      signature: string;
      slot: number;
    };
  };
}

export interface HeliusTransactionData {
  signature: string;
  timestamp: number;
  slot: number;
  type: 'buy' | 'sell' | 'create';
  amount: number;
  price: number;
  tokenAddress: string;
  walletAddress: string;
}

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  imageLink?: string;
  uri?: string;
}

export interface TokenStats {
  price: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  holders: number;
  trades24h: number;
}
