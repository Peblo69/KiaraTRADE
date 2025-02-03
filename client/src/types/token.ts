import { Time } from 'lightweight-charts';

export interface TokenTrade {
  timestamp: number;
  txType: 'buy' | 'sell' | 'create';
  traderPublicKey: string;
  counterpartyPublicKey?: string;
  tokenAmount: number;
  solAmount: number;
  priceInUsd?: number;
  priceInSol?: number;
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
  socials?: {
    website?: string | null;
    twitter?: string | null;
    telegram?: string | null;
    pumpfun?: string | null;
  };
  priceInUsd?: number;
  marketCapSol?: number;
  solPrice?: number;
  vSolInBondingCurve?: number;
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
  holdersCount?: number;
  devWalletPercentage?: number;
  insiderPercentage?: number;
  top10HoldersPercentage?: number;
  snipersCount?: number;
  bondingCurveKey?: string;
  devWallet?: string;
  lastAnalyzedAt?: string;
  analyzedBy?: string;
  createdAt?: string;
}

export interface PumpPortalToken {
  symbol: string;
  name: string;
  address: string;
  socials?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    pumpfun?: string;
  };
}

export interface CandlestickData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}