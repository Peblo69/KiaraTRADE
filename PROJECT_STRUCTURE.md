# PumpVision Project Structure Guide

## 1. Core Components Overview

### Frontend Structure
```
client/
├── src/
│   ├── components/
│   │   ├── trading/       # Trading-specific components
│   │   ├── ui/           # Shared UI components
│   │   └── wallet/       # Wallet-related components
│   ├── lib/             # Utilities and stores
│   ├── pages/           # Route pages
│   └── types/          # TypeScript definitions
```

### Key Files and Their Purpose

#### 1. Main Application Files
- `client/src/pages/pumpfun-vision.tsx`
  - Main PumpVision page component
  - Handles layout and component composition
  - Manages token selection and view states
  - Integration point for all trading components
  ```typescript
  // Key features:
  - TokenStats display
  - Market statistics
  - Trading chart
  - Order book
  - Trade history
  - Wallet tracking
  ```

#### 2. Store and State Management
- `client/src/lib/pump-portal-store.ts`
  - Central state management using Zustand
  - Handles token data and trading state
  - Key interfaces:
  ```typescript
  interface Token {
    symbol: string;
    priceInUsd: number;
    marketCapSol: number;
    vSolInBondingCurve: number;
    devWallet?: string;
    imageUrl?: string;
    metadata?: {
      mint?: boolean;
      uri?: string;
      imageUrl?: string;
    };
    recentTrades?: Array<{
      timestamp: number;
      priceInUsd: number;
    }>;
  }
  ```

#### 3. WebSocket Integration
- `server/pumpportal.ts`
  - WebSocket server implementation
  - Handles real-time data streaming
  - Manages connection state and reconnection logic
  ```typescript
  // Key functionalities:
  - Token data synchronization
  - Trade updates
  - Market data streaming
  ```

#### 4. Trading Components

##### MarketStats Component
- `TradingView/project/src/components/MarketStats.tsx`
  - Displays market statistics
  - Real-time price updates
  - Volume and liquidity information
  ```typescript
  interface Props {
    tokenAddress: string;
  }
  ```

##### SocialMetrics Component
- `TradingView/project/src/components/SocialMetrics.tsx`
  - Social engagement metrics
  - Community statistics
  - Trading sentiment analysis

##### Trading Chart Component
- `TradingView/project/src/components/TradingChart.tsx`
  - Price chart visualization
  - Technical indicators
  - Time frame selection

##### Order Book Component
- `TradingView/project/src/components/OrderBook.tsx`
  - Live order book display
  - Buy/sell orders
  - Price levels visualization

##### TopBar Component
- `client/src/components/TopBar.tsx`
  - Navigation and controls
  - Token search
  - User notifications
  - Security panel
  - AI assistant integration

## 2. Dependencies and Integration

### Required NPM Packages
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.66.0",
    "zustand": "^5.0.3",
    "ws": "^8.18.0",
    "react-financial-charts": "^2.0.1",
    "lightweight-charts": "^4.2.3"
  }
}
```

### Environment Variables
```env
DATABASE_URL=postgresql://...
PGUSER=...
PGPASSWORD=...
PGDATABASE=...
PGHOST=...
PGPORT=...
```

## 3. Migration Guide

### Step 1: Create New Directory Structure
```bash
mkdir -p new-project/src/{components,lib,pages}
mkdir -p new-project/src/components/{trading,ui,wallet}
```

### Step 2: Copy Core Files
1. Copy main page:
   ```bash
   cp client/src/pages/pumpfun-vision.tsx new-project/src/pages/
   ```

2. Copy store:
   ```bash
   cp client/src/lib/pump-portal-store.ts new-project/src/lib/
   ```

3. Copy components:
   ```bash
   cp -r TradingView/project/src/components/* new-project/src/components/trading/
   ```

### Step 3: Update Imports
- Update all import paths to use aliases:
  ```typescript
  // Before
  import { MarketStats } from '../../../TradingView/project/src/components/MarketStats';
  
  // After
  import { MarketStats } from '@/components/trading/MarketStats';
  ```

### Step 4: Configure TypeScript
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 4. Integration Points

### WebSocket Connection
- Server: `server/pumpportal.ts`
- Client: `client/src/lib/pump-portal-websocket.ts`
- Connection establishment in `PumpFunVision` component

### State Management
- Central store: `pump-portal-store.ts`
- Component connection via hooks:
  ```typescript
  const tokens = usePumpPortalStore(state => state.tokens);
  ```

### Data Flow
1. WebSocket receives updates
2. Store updates state
3. Components re-render with new data

## 5. Component Dependencies

### MarketStats
- Depends on: `pump-portal-store`
- Required props: `tokenAddress`
- Updates on: token price, volume changes

### SocialMetrics
- Depends on: `pump-portal-store`
- Required props: `tokenAddress`
- Updates on: trader activity, sentiment changes

### Trading Chart
- Depends on: `lightweight-charts`
- Required props: `tokenAddress`
- Updates on: price changes, new trades

### TopBar
- Depends on: `pump-portal-store`
- Optional props: `tokenAddress`
- Features: security panel, AI assistant

## 6. Error Handling

### WebSocket Reconnection
```typescript
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

function connect() {
  // Reconnection logic
}
```

### Component Error Boundaries
```typescript
<ErrorBoundary>
  <TradingComponent />
</ErrorBoundary>
```

## 7. Styling

### Theme Configuration
```json
{
  "variant": "professional",
  "primary": "hsl(265, 89%, 78%)",
  "appearance": "dark",
  "radius": 0.5
}
```

### CSS Classes
- Use Tailwind utilities
- Custom classes for animations
- Responsive design breakpoints

## 8. Testing

### Component Testing
- Test token data updates
- Verify WebSocket connections
- Validate price calculations

### Integration Testing
- Full trading flow
- WebSocket reconnection
- Error handling

## 9. Performance Considerations

### Optimization Techniques
- Use `useMemo` for expensive calculations
- Implement virtual scrolling for large lists
- Lazy load components when possible

### Memory Management
- Clean up WebSocket connections
- Unsubscribe from store updates
- Clear intervals and timeouts

## 10. Security

### Data Validation
- Validate WebSocket messages
- Sanitize user inputs
- Verify token addresses

### Error Handling
- Implement fallbacks
- Log errors appropriately
- Show user-friendly messages
