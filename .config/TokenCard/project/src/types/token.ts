/**
 * Token interface representing the core token data structure
 * Integration Point: Backend should provide data matching this interface
 */
export interface Token {
  // Core token information
  address: string;          // Token contract address
  name: string;            // Token name
  symbol: string;          // Token symbol
  
  // Price and market data
  priceInUsd?: number;     // Current price in USD
  marketCapSol?: number;   // Market cap in SOL
  solPrice?: number;       // Current SOL price
  vSolInBondingCurve?: number; // Volume of SOL in bonding curve
  
  // Metadata
  metadata?: {
    name: string;
    symbol: string;
    uri?: string;
    imageUrl?: string;    // Token logo URL (HTTPS only)
  };
  imageUrl?: string;      // Alternative token logo URL
  
  // Trading data
  recentTrades?: any[];   // Recent trading activity
  isNew?: boolean;        // Flag for newly listed tokens
  
  // Holder metrics
  holdersCount?: number;           // Total number of holders
  devWalletPercentage?: number;    // Percentage held by dev wallet (0-100)
  insiderPercentage?: number;      // Percentage held by insiders (0-100)
  top10HoldersPercentage?: number; // Percentage held by top 10 holders (0-100)
  snipersCount?: number;           // Number of detected sniper bots
  
  // Social links
  socials?: {
    website?: string;    // Project website URL
    twitter?: string;    // Twitter/X profile URL
    telegram?: string;   // Telegram group/channel URL
    pumpfun?: string;   // PumpFun profile URL
  };
}