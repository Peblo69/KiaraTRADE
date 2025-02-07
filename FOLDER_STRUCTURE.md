# PumpVision Project Migration Guide

## Current Structure Analysis

### Core Components Overview

1. Frontend Structure
```
client/
├── src/
│   ├── components/
│   │   ├── trading/       # Trading-specific components
│   │   ├── ui/           # Shared UI components (shadcn)
│   │   └── wallet/       # Wallet-related components
│   ├── lib/             # Utilities and stores
│   ├── pages/           # Route pages
│   └── types/          # TypeScript definitions
```

2. Backend Structure
```
server/
├── services/          # Core services
├── routes.ts         # API routes
└── pumpportal.ts     # WebSocket implementation
```

### Key Components and Their Dependencies

1. PumpFunVision Page (`client/src/pages/pumpfun-vision.tsx`)
   - Main entry point for the trading interface
   - Dependencies:
     ```typescript
     import { TokenStats } from '@/components/TokenStats';
     import { MarketStats } from '@/components/trading/MarketStats';
     import { OrderBook } from '@/components/OrderBook';
     import { TradeHistory } from '@/components/TradeHistory';
     import { TradingForm } from '@/components/TradingForm';
     ```

2. WebSocket Store (`client/src/lib/pump-portal-store.ts`)
   - Central state management
   - Used by all trading components
   - Key interfaces:
     ```typescript
     interface Token {
       symbol: string;
       priceInUsd: number;
       marketCapSol: number;
       vSolInBondingCurve: number;
       metadata?: TokenMetadata;
       recentTrades?: Trade[];
     }
     ```

3. Market Components
   - `MarketStats.tsx`: Price and volume statistics
   - `TokenStats.tsx`: Detailed token information
   - `SocialMetrics.tsx`: Community engagement metrics
   - All depend on `pump-portal-store` for data

## New Structure Organization

### 1. Core Directory Structure
```
pumpvision/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── trading/
│   │   │   │   ├── market/
│   │   │   │   │   ├── MarketStats.tsx
│   │   │   │   │   ├── TokenStats.tsx
│   │   │   │   │   └── SocialMetrics.tsx
│   │   │   │   ├── chart/
│   │   │   │   │   ├── TradingChart.tsx
│   │   │   │   │   └── ChartControls.tsx
│   │   │   │   ├── order/
│   │   │   │   │   ├── OrderBook.tsx
│   │   │   │   │   └── TradingForm.tsx
│   │   │   │   └── history/
│   │   │   │       ├── TradeHistory.tsx
│   │   │   │       └── TransactionList.tsx
│   │   │   ├── common/
│   │   │   │   ├── TopBar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   └── ui/           # shadcn components
│   │   ├── lib/
│   │   │   ├── store/
│   │   │   │   ├── pump-portal-store.ts
│   │   │   │   └── trading-store.ts
│   │   │   ├── api/
│   │   │   │   └── websocket.ts
│   │   │   └── utils/
│   │   │       ├── format.ts
│   │   │       └── trade-calculations.ts
│   │   ├── pages/
│   │   │   └── pumpfun-vision.tsx
│   │   └── types/
│   │       ├── token.ts
│   │       └── trade.ts
│   ├── public/
│   │   └── assets/
│   └── index.html
└── server/
    ├── src/
    │   ├── services/
    │   │   ├── websocket.ts
    │   │   └── pump-portal-sync.ts
    │   ├── routes/
    │   │   └── api.ts
    │   └── types/
    │       └── index.ts
    └── index.ts
```

### 2. File Migration Map

1. Trading Components:
   ```
   Current: TradingView/project/src/components/MarketStats.tsx
   New: client/src/components/trading/market/MarketStats.tsx

   Current: TradingView/project/src/components/SocialMetrics.tsx
   New: client/src/components/trading/market/SocialMetrics.tsx

   Current: client/src/components/TokenStats.tsx
   New: client/src/components/trading/market/TokenStats.tsx
   ```

2. Store and Utils:
   ```
   Current: client/src/lib/pump-portal-store.ts
   New: client/src/lib/store/pump-portal-store.ts

   Current: client/src/lib/pump-portal-websocket.ts
   New: client/src/lib/api/websocket.ts
   ```

3. Main Page:
   ```
   Current: client/src/pages/pumpfun-vision.tsx
   New: client/src/pages/pumpfun-vision.tsx (same location)
   ```

### 3. Dependencies to Install

```bash
# Core dependencies
@tanstack/react-query
zustand
lightweight-charts
ws

# UI components
@radix-ui/*
lucide-react
tailwindcss
@tailwindcss/typography

# Data handling
date-fns
zod
```

### 4. Step-by-Step Migration Process

1. Create New Directory Structure
```bash
mkdir -p pumpvision/client/src/{components,lib,pages,types}
mkdir -p pumpvision/client/src/components/{trading,common,ui}
mkdir -p pumpvision/client/src/components/trading/{market,chart,order,history}
mkdir -p pumpvision/client/src/lib/{store,api,utils}
```

2. Copy and Update Trading Components
   - Copy each component to its new location
   - Update imports to use new paths
   - Example:
   ```typescript
   // Old imports
   import { usePumpPortalStore } from '../../../lib/pump-portal-store';
   
   // New imports
   import { usePumpPortalStore } from '@/lib/store/pump-portal-store';
   ```

3. Update Store Integration
   - Move store files to new location
   - Update WebSocket connection logic
   - Example store setup:
   ```typescript
   // client/src/lib/store/pump-portal-store.ts
   import { create } from 'zustand';
   import type { Token, Trade } from '@/types';

   interface PumpPortalStore {
     tokens: Record<string, Token>;
     trades: Trade[];
     // ... rest of the store interface
   }

   export const usePumpPortalStore = create<PumpPortalStore>((set) => ({
     tokens: {},
     trades: [],
     // ... store implementation
   }));
   ```

4. Configure TypeScript
   Update tsconfig.json paths:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"],
         "@components/*": ["./src/components/*"],
         "@lib/*": ["./src/lib/*"]
       }
     }
   }
   ```

5. Update Main Page Layout
   ```typescript
   // client/src/pages/pumpfun-vision.tsx
   import { FC } from 'react';
   import { MarketStats } from '@/components/trading/market/MarketStats';
   import { TokenStats } from '@/components/trading/market/TokenStats';
   // ... other imports

   const PumpFunVision: FC = () => {
     // ... component implementation
   };
   ```

### 5. Key Points to Remember

1. Component Dependencies
   - All trading components depend on pump-portal-store
   - TopBar needs access to all trading components
   - TradingChart requires lightweight-charts

2. WebSocket Connection
   - Initialize in pumpfun-vision.tsx
   - Handle reconnection in store
   - Broadcast updates to all components

3. Error Handling
   - Implement ErrorBoundary for each major component
   - Handle WebSocket disconnections
   - Show loading states during data fetch

4. State Management
   - Use zustand for global state
   - Implement proper type safety
   - Handle store updates efficiently

### 6. Testing After Migration

1. Verify WebSocket Connection
   - Check real-time updates
   - Verify reconnection logic
   - Test data flow to components

2. Test Component Rendering
   - Verify all charts and graphs
   - Check trading functionality
   - Test responsive layout

3. Performance Checks
   - Monitor memory usage
   - Check render cycles
   - Verify WebSocket efficiency

### 7. Common Issues and Solutions

1. Component Loading
   ```typescript
   // Use Suspense for heavy components
   import { Suspense } from 'react';
   
   <Suspense fallback={<LoadingSpinner />}>
     <TradingChart />
   </Suspense>
   ```

2. Store Updates
   ```typescript
   // Optimize store updates
   const token = usePumpPortalStore(
     (state) => state.tokens[tokenAddress],
     (a, b) => a?.priceInUsd === b?.priceInUsd
   );
   ```

3. WebSocket Reconnection
   ```typescript
   // Implement exponential backoff
   const reconnect = (attempt: number) => {
     const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
     setTimeout(connect, delay);
   };
   ```

### 8. Deployment Considerations

1. Environment Variables
   ```env
   VITE_WS_URL=wss://your-api.com/ws
   VITE_API_BASE_URL=https://your-api.com
   ```

2. Build Configuration
   ```typescript
   // vite.config.ts
   export default defineConfig({
     build: {
       sourcemap: true,
       chunkSizeWarningLimit: 1000,
     },
     // ... other config
   });
   ```

3. Production Optimizations
   - Enable code splitting
   - Implement proper caching
   - Configure error tracking

This structure ensures:
- Clear separation of concerns
- Easy maintenance and updates
- Efficient state management
- Proper type safety
- Scalable architecture
