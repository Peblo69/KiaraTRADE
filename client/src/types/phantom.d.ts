interface Window {
  phantom?: {
    solana?: {
      isPhantom?: boolean;
      connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: any }>;
      disconnect(): Promise<void>;
      on(event: string, callback: (...args: any[]) => void): void;
      request(params: any): Promise<any>;
      publicKey: any;
    };
  };
}