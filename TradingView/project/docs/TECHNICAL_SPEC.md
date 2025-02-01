# Trading Interface Technical Documentation

## TopBar Component

### Market Stats (Real-time WebSocket Updates Required)
- Trading Pair Display (BTC/USDT)
  ```typescript
  interface MarketStats {
    pair: string;           // e.g. "BTC/USDT"
    currentPrice: number;   // e.g. 46789.00
    change24h: number;      // e.g. 2.45 (percentage)
    volume24h: number;      // e.g. 1200000000 (in USD)
    high24h: number;        // e.g. 47123.00
  }
  ```

### Time Frame Buttons
- Buttons: 5M, 1H, 4H
  ```typescript
  type TimeFrame = '5M' | '1H' | '4H';
  interface TimeFrameUpdate {
    timeFrame: TimeFrame;
    candleData: CandleData[];
  }
  ```

### KIARA Vision Pro Integration
- AI Assistant Features:
  ```typescript
  interface KiaraMessage {
    type: 'ai' | 'user';
    content: string;
    timestamp: number;
    messageId: string;
  }
  
  interface KiaraAnalysis {
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
    technicalIndicators: {
      rsi: number;
      macd: {
        value: number;
        signal: number;
        histogram: number;
      };
      movingAverages: {
        ma20: number;
        ma50: number;
        ma200: number;
      };
    };
    tradingSuggestions: {
      action: 'buy' | 'sell' | 'hold';
      reason: string;
      confidence: number;
    }[];
  }
  ```

### Security Audit Panel
```typescript
interface SecurityAudit {
  isMintable: boolean;
  isTokenDataMutable: boolean;
  isFreezable: boolean;
  updateAuthority: string;
  ownerBalance: number;
  lpBurned: number;
  top10HoldersPercentage: number;
  deployerAddress: string;
  securityScore: number;
  auditStatus: 'safe' | 'warning' | 'danger';
}
```

## OrderBook Component

### Order Book Data Structure
```typescript
interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
  sum: number;
}

interface OrderBook {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  spread: number;
  spreadPercentage: number;
}

// WebSocket message format for order book updates
interface OrderBookUpdate {
  type: 'snapshot' | 'update';
  data: {
    asks: [number, number][]; // [price, size]
    bids: [number, number][]; // [price, size]
    timestamp: number;
  };
}
```

## TradingForm Component

### Order Placement
```typescript
interface OrderFormData {
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  amount: number;
  price?: number; // Required for limit orders
  total?: number; // Calculated field
  leverage?: number; // For future margin trading implementation
}

interface OrderResponse {
  orderId: string;
  status: 'pending' | 'filled' | 'partial' | 'cancelled';
  filledAmount: number;
  remainingAmount: number;
  averagePrice: number;
  timestamp: number;
}
```

### Balance Information
```typescript
interface UserBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}
```

## TradeHistory Component

### Trade Data
```typescript
interface Trade {
  id: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  timestamp: number;
  wallet: string;
  maker: boolean;
  fee: number;
}

// WebSocket message for real-time trades
interface TradeUpdate {
  type: 'trade';
  data: Trade;
}
```

## MarketStats Component

### Market Statistics
```typescript
interface MarketStatistics {
  marketCap: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number;
  priceChange: {
    '1h': number;
    '24h': number;
    '7d': number;
  };
  volume: {
    '24h': number;
    change24h: number;
  };
  liquidity: {
    total: number;
    change24h: number;
  };
  ath: {
    price: number;
    timestamp: number;
  };
  atl: {
    price: number;
    timestamp: number;
  };
}
```

## HolderAnalytics Component

### Holder Data
```typescript
interface HolderAnalytics {
  totalHolders: number;
  newHolders24h: number;
  leftHolders24h: number;
  topHolders: {
    address: string;
    amount: number;
    percentage: number;
  }[];
  distribution: {
    range: string;
    holders: number;
    percentage: number;
  }[];
}
```

## SocialMetrics Component

### Social Data
```typescript
interface SocialMetrics {
  communityScore: number;
  socialVolume: {
    value: number;
    change24h: number;
  };
  sentiment: {
    value: 'bullish' | 'bearish' | 'neutral';
    score: number;
  };
  trendingTopics: {
    topic: string;
    mentions: number;
    sentiment: number;
  }[];
}
```

## WebSocket Connection Management

### Connection Handling
```typescript
interface WebSocketConfig {
  endpoint: string;
  channels: {
    name: string;
    symbols: string[];
  }[];
  reconnectAttempts: number;
  reconnectInterval: number;
}

interface WebSocketMessage {
  type: 'orderbook' | 'trade' | 'ticker' | 'kline';
  symbol: string;
  data: any;
  timestamp: number;
}
```

## Error Handling

### Error Types
```typescript
interface TradingError {
  code: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: number;
  data?: any;
}

interface ValidationError {
  field: string;
  message: string;
  constraints: any;
}
```

## Rate Limiting

### Rate Limit Configuration
```typescript
interface RateLimits {
  orders: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
  };
  trades: {
    maxVolume24h: number;
    maxTrades24h: number;
  };
  websocket: {
    maxConnections: number;
    maxSubscriptions: number;
  };
}
```