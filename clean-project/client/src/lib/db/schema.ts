import { z } from "zod";

// Define client-side types that mirror the server schema but only include what's needed
export interface Token {
  address: string;
  symbol: string;
  name: string;
  image_url?: string;
  created_at: Date;
  initial_price_usd: number;
  initial_liquidity_usd: number;
  bonding_curve_key?: string;
  status_mad: boolean;
  status_fad: boolean;
  status_lb: boolean;
  status_tri: boolean;
}

export interface TokenTrade {
  timestamp: Date;
  price_usd: number;
  volume_usd: number;
  amount_sol: number;
  is_buy: boolean;
  wallet_address: string;
  tx_signature: string;
}

// Export type aliases for compatibility with existing code
export type { Token as tokens, TokenTrade as token_trades };