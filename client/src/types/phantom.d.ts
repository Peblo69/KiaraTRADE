interface Window {
  phantom?: {
    solana?: {
      isPhantom?: boolean;
      connect(): Promise<{ publicKey: any }>;
      disconnect(): Promise<void>;
      on(event: string, callback: () => void): void;
      request(params: any): Promise<any>;
      publicKey: any;
    };
  };
}