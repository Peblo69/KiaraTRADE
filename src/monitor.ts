import { Connection, PublicKey } from "@solana/web3.js";
import WebSocket from "ws";
import axios from "axios";
import { config } from "./config";
import { validateEnv } from "./utils/env-validator";

interface TokenData {
  address: string;
  symbol?: string;
  name?: string;
  price?: number;
  volume24h?: number;
  marketCap?: number;
  holders?: number;
}

interface WalletData {
  address: string;
  balance: number;
  tokens: Array<{
    mint: string;
    amount: number;
  }>;
  recentTransactions: Array<{
    signature: string;
    timestamp: number;
    type: 'in' | 'out';
    amount: number;
  }>;
}

class MonitorService {
  private connection: Connection | null = null;
  private ws: WebSocket | null = null;
  private tokenDataMap: Map<string, TokenData> = new Map();
  private walletDataMap: Map<string, WalletData> = new Map();
  private env: ReturnType<typeof validateEnv>;

  constructor() {
    this.env = validateEnv();
  }

  async initialize() {
    try {
      console.log("Initializing monitor service...");
      
      // Initialize Solana connection
      this.connection = new Connection(this.env.HELIUS_HTTPS_URI);
      
      // Initialize WebSocket connection
      this.ws = new WebSocket(this.env.HELIUS_WSS_URI);
      
      this.setupWebSocketHandlers();
      
      console.log("Monitor service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize monitor service:", error);
      throw error;
    }
  }

  private setupWebSocketHandlers() {
    if (!this.ws) return;

    this.ws.on("open", () => {
      console.log("WebSocket connection established");
      this.subscribeToTokenProgram();
    });

    this.ws.on("message", async (data: WebSocket.Data) => {
      try {
        const parsedData = JSON.parse(data.toString());
        await this.handleWebSocketMessage(parsedData);
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });

    this.ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    this.ws.on("close", () => {
      console.log("WebSocket connection closed, attempting to reconnect...");
      setTimeout(() => this.initialize(), 5000);
    });
  }

  private subscribeToTokenProgram() {
    if (!this.ws) return;

    // Subscribe to Raydium program for token events
    const subscribeMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "logsSubscribe",
      params: [
        {
          mentions: [config.liquidity_pool.radiyum_program_id],
        },
        {
          commitment: "processed",
        },
      ],
    };

    this.ws.send(JSON.stringify(subscribeMessage));
  }

  private async handleWebSocketMessage(data: any) {
    // Handle subscription confirmation
    if (data.result !== undefined && !data.error) {
      console.log("Successfully subscribed to program logs");
      return;
    }

    // Handle program log messages
    const logs = data?.params?.result?.value?.logs;
    const signature = data?.params?.result?.value?.signature;

    if (!Array.isArray(logs) || !signature) return;

    // Check for new pool creation
    const isNewPool = logs.some(log => 
      typeof log === "string" && 
      log.includes("Program log: initialize2: InitializeInstruction2")
    );

    if (isNewPool) {
      await this.handleNewToken(signature);
    }
  }

  private async handleNewToken(signature: string) {
    try {
      const response = await axios.get(`${this.env.HELIUS_HTTPS_URI_TX}${signature}`);
      if (!response.data || response.data.length === 0) return;

      const tokenMint = response.data[0].tokenTransfers?.[0]?.mint;
      if (!tokenMint) return;

      // Store basic token data
      this.tokenDataMap.set(tokenMint, {
        address: tokenMint,
        symbol: "Unknown",
        name: "New Token",
      });

      // Emit token data to any subscribers
      this.emitTokenUpdate(tokenMint);
      
      // Fetch additional token metadata
      this.fetchTokenMetadata(tokenMint);
    } catch (error) {
      console.error("Error handling new token:", error);
    }
  }

  private async fetchTokenMetadata(tokenMint: string) {
    try {
      // Fetch token metadata from various sources
      const metadataUrl = `${this.env.DEX_HTTPS_LATEST_TOKENS}${tokenMint}`;
      const response = await axios.get(metadataUrl);
      
      if (response.data && response.data.pairs?.[0]) {
        const pair = response.data.pairs[0];
        
        this.tokenDataMap.set(tokenMint, {
          ...this.tokenDataMap.get(tokenMint),
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          price: pair.priceUsd,
          volume24h: pair.volume24h,
          marketCap: pair.marketCap,
        });

        this.emitTokenUpdate(tokenMint);
      }
    } catch (error) {
      console.error("Error fetching token metadata:", error);
    }
  }

  private emitTokenUpdate(tokenMint: string) {
    const tokenData = this.tokenDataMap.get(tokenMint);
    if (tokenData) {
      console.log("Token Update:", tokenData);
      // Here you would emit the data to your frontend
    }
  }

  // Wallet monitoring methods
  async addWalletToMonitor(walletAddress: string) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection?.getBalance(publicKey);
      
      this.walletDataMap.set(walletAddress, {
        address: walletAddress,
        balance: balance || 0,
        tokens: [],
        recentTransactions: [],
      });

      // Start monitoring this wallet
      this.monitorWalletActivity(walletAddress);
    } catch (error) {
      console.error("Error adding wallet to monitor:", error);
    }
  }

  private async monitorWalletActivity(walletAddress: string) {
    if (!this.connection || !this.ws) return;

    try {
      const publicKey = new PublicKey(walletAddress);
      
      // Subscribe to account changes
      this.connection.onAccountChange(
        publicKey,
        (accountInfo) => {
          const walletData = this.walletDataMap.get(walletAddress);
          if (walletData) {
            walletData.balance = accountInfo.lamports;
            this.emitWalletUpdate(walletAddress);
          }
        },
        "confirmed"
      );

      // Fetch initial token holdings
      await this.updateWalletTokens(walletAddress);
    } catch (error) {
      console.error("Error monitoring wallet activity:", error);
    }
  }

  private async updateWalletTokens(walletAddress: string) {
    if (!this.connection) return;

    try {
      const response = await axios.get(
        `${this.env.HELIUS_HTTPS_URI}/v0/addresses/${walletAddress}/balances`
      );

      const walletData = this.walletDataMap.get(walletAddress);
      if (walletData && response.data?.tokens) {
        walletData.tokens = response.data.tokens.map((token: any) => ({
          mint: token.mint,
          amount: token.amount,
        }));
        this.emitWalletUpdate(walletAddress);
      }
    } catch (error) {
      console.error("Error updating wallet tokens:", error);
    }
  }

  private emitWalletUpdate(walletAddress: string) {
    const walletData = this.walletDataMap.get(walletAddress);
    if (walletData) {
      console.log("Wallet Update:", walletData);
      // Here you would emit the data to your frontend
    }
  }
}

// Export singleton instance
export const monitorService = new MonitorService();

// Initialize the service when the module is imported
monitorService.initialize().catch(console.error);
