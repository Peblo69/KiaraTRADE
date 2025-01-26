export interface WebSocketRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: [
    {
      mentions?: string[];
    },
    {
      commitment: string;
    }
  ];
}

export interface TransactionResult {
  solMint?: string;
  tokenMint?: string;
  signature?: string;
}

export interface SwapDetails {
  id?: number;
  signature: string;
  mint: string;
  tokenAmount: number;
  solAmount: number;
  timestamp?: number;
  type: string;
}
