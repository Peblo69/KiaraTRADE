# Helius WebSocket Integration Data Flow

## 1. Initial Token Selection
When a user selects a token to view (in TokenChart.tsx or TokenPage.tsx):

```tsx
const token = usePumpPortalStore(state => state.getToken(tokenAddress));
```

## 2. Chart Data Hook (useChartData.ts)
The useChartData hook initializes data streams:

```typescript
useEffect(() => {
  // 1. Initialize Helius WebSocket if not connected
  const heliusStore = useHeliusStore.getState();
  if (!heliusStore.isConnected) {
    initializeHeliusWebSocket();
  }
  
  // 2. Subscribe to token updates
  heliusStore.subscribeToToken(tokenAddress);
}, [tokenAddress]);
```

## 3. Helius WebSocket Connection (helius-websocket.ts)
The WebSocket connection is established with these steps:

a) Connection Setup:
```typescript
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/v2/?api-key=${HELIUS_API_KEY}`;
ws = new WebSocket(HELIUS_WS_URL);
```

b) Token Subscription:
```typescript
const subscribeMessage = {
  jsonrpc: '2.0',
  id: `token-sub-${tokenAddress}`,
  method: 'accountSubscribe',
  params: [
    tokenAddress,
    {
      encoding: 'jsonParsed',
      commitment: 'confirmed'
    }
  ]
};
```

## 4. Data Processing Chain

### a) Helius Message Reception
When a message is received from Helius:
```typescript
ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  
  if (data.method === 'accountNotification') {
    const value = data.params?.result?.value;
    if (value.data?.program === 'spl-token') {
      const tokenData = value.data.parsed?.info;
      // Process token data...
    }
  }
}
```

### b) Chart Store Update (chart-websocket.ts)
Data is stored in the chart store:
```typescript
useChartStore.getState().addTrade(tokenData.mint, {
  timestamp: Date.now(),
  priceInUsd: (tokenData.tokenAmount.uiAmount || 0) * solPrice,
  amount: tokenData.tokenAmount.uiAmount || 0
});
```

### c) Chart Data Processing
The useChartData hook processes trades into candlesticks:
```typescript
// Group trades by time interval
const candleMap = new Map<number, CandleData>();
trades.forEach(trade => {
  const minuteTimestamp = Math.floor(trade.timestamp / MINUTE) * MINUTE;
  // Process trade into candle...
});
```

## 5. Chart Rendering
Finally, the chart component renders the processed data:
```typescript
const candleSeries = chart.addCandlestickSeries({
  upColor: '#26a69a',
  downColor: '#ef5350',
  // ...
});
candleSeries.setData(candleData);
```

## Key Files and Their Roles:

1. client/src/lib/helius-websocket.ts
- Manages WebSocket connection to Helius
- Handles token subscriptions
- Processes incoming WebSocket messages

2. client/src/lib/chart-websocket.ts
- Stores trade data
- Manages trade history
- Provides methods to add/retrieve trades

3. client/src/hooks/useChartData.ts
- Connects WebSocket data to chart
- Processes trades into candlesticks
- Manages chart state

4. client/src/components/TokenChart.tsx
- Renders the chart UI
- Uses processed chart data
- Handles user interactions

## Data Flow Summary:
1. User selects token → Component mounts
2. useChartData initializes → Connects to Helius
3. Helius sends updates → WebSocket receives
4. Data processed → Stored in chart store
5. Chart hook processes → Updates UI
6. Component re-renders → User sees updates

## Error Handling:
- Connection retries on failure
- Message validation at each step
- Price validation before updates
- Automatic reconnection logic
