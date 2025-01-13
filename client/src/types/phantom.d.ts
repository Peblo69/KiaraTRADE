interface PhantomProvider {
  solana?: {
    connect(): Promise<{ publicKey: any }>;
    disconnect(): Promise<void>;
    on(event: string, callback: () => void): void;
    request(params: any): Promise<any>;
  };
}

interface Window {
  phantom?: PhantomProvider;
}
