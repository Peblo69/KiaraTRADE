
import { type } from "os";

export interface Token {
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
  recentTrades?: any[];
  isNew?: boolean;
  holdersCount?: number;
  devWalletPercentage?: number;
  insiderPercentage?: number;
  top10HoldersPercentage?: number;
  snipersCount?: number;
  socials?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    pumpfun?: string;
  };
}
