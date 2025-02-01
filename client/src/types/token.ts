export interface TokenTrade {
  timestamp: number;
  txType: 'buy' | 'sell' | 'create';
  traderPublicKey: string;
  counterpartyPublicKey?: string;
  tokenAmount: number;
  solAmount: number;
  signature: string;
  mint: string;
  bondingCurveKey?: string;
  vTokensInBondingCurve?: number;
  vSolInBondingCurve?: number;
  marketCapSol?: number;
}

export interface Token {
  address: string;
  name: string;
  symbol: string;
  priceInUsd?: number;
  marketCapSol?: number;
  solPrice?: number;
  vSolInBondingCurve?: number;
  bondingCurveKey?: string;
  vTokensInBondingCurve?: number;
  metadata?: {
    name: string;
    symbol: string;
    uri?: string;
    imageUrl?: string;
    creators?: Array<{
      address: string;
      verified: boolean;
      share: number;
    }>;
  };
  imageUrl?: string;
  recentTrades?: TokenTrade[];
  isNew?: boolean;
  socials?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    pumpfun?: string;
  };
}

export interface PumpPortalToken extends Token {
  // Additional PumpPortal specific fields
  pool?: string;
  devWallet?: string;
  createdAt?: string;
  lastAnalyzedAt?: string;
  analyzedBy?: string;
}