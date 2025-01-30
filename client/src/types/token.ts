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
  };
  recentTrades?: any[];
  isNew?: boolean;
}