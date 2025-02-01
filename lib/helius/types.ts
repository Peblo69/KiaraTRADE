export interface TokenTrade {
    signature: string;
    timestamp: number;
    wallet: string;
    type: 'buy' | 'sell';
    tokenAmount: number;
    solAmount: number;
    priceSOL: number;
    priceUSD: number;
    slip: number;  // Price impact/slippage
}

export interface TokenStats {
    price: number;
    priceUSD: number;
    volume24h: number;
    volumeUSD24h: number;
    marketCap: number;
    marketCapUSD: number;
    liquidity: number;
    liquidityUSD: number;
    holders: number;
    trades24h: number;
    lastUpdate: number;
}

export interface TokenData {
    mint: string;
    stats: TokenStats;
    trades: TokenTrade[];
    recentTrades: TokenTrade[];  // Last 30 trades
    priceHistory: {
        time: number;
        price: number;
        volume: number;
    }[];
}
