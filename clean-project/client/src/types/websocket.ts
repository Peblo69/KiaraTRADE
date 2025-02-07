
export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface TradeMessage {
  type: 'trade';
  data: {
    signature: string;
    mint: string;
    txType: 'buy' | 'sell';
    tokenAmount: number;
    solAmount: number;
    traderPublicKey: string;
    counterpartyPublicKey: string;
    timestamp: number;
  };
}
