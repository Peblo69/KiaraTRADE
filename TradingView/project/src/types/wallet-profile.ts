export interface WalletProfile {
  type: 'whale' | 'bot' | 'dev' | 'paper' | 'diamond' | 'unknown';
  confidence: number;
  traits: string[];
  stats: {
    totalVolume: number;
    tradeCount: number;
    avgTradeSize: number;
    lastActive: Date;
    firstSeen: Date;
  };
}
