# CODE 1 - Kiara AI Cryptocurrency Platform Snapshot

## Core Components
### Frontend Components
1. **Navbar (`Navbar.tsx`)**
   - Cyberpunk-styled navigation with glitch effect logo
   - Navigation links: Home, About Us, Project, Kiara, Subscriptions
   - Connect Wallet button

2. **Space Background (`SpaceBackground.tsx`)**
   - Animated star field background
   - Dynamic twinkling effect
   - Subtle, non-intrusive animation

3. **Kiara Video (`KiaraVideoWrapper.tsx`)**
   - Interactive AI assistant video
   - Starts on first frame when idle
   - Plays with audio on click
   - Returns to first frame after completion

4. **Crypto Price Display (`CryptoPrice.tsx`)**
   - Real-time price updates for BTC, ETH, SOL
   - Price change indicators
   - WebSocket integration for live updates

5. **AI Chat Interface (`AiChat.tsx`)**
   - Interactive chat with KIARA AI
   - Cyberpunk-styled chat bubbles
   - Typing indicators
   - Message history display

6. **Trading Chart (`TradingChart.tsx`)**
   - TradingView chart integration
   - Technical analysis tools
   - Dark theme optimization

7. **Subscription Plans (`SubscriptionPlans.tsx`)**
   - Three-tier subscription system
   - Animated hover effects
   - SOL payment integration ready

8. **Theme Switcher (`ThemeSwitcher.tsx`)**
   - Purple/Green/Red theme options
   - Dynamic theme application

### Backend Components
1. **WebSocket Server**
   - Real-time cryptocurrency price updates
   - Price simulation for development
   - Error handling and reconnection logic

2. **Database Schema**
   - User management
   - Subscription tracking
   - Wallet integration

## Key Features
1. Cyberpunk Design Language
   - Dark theme with purple accents
   - Glassmorphism effects
   - Animated elements
   - VT323 font for headings

2. Real-time Data
   - WebSocket price updates
   - Live chat functionality
   - Trading chart integration

3. AI Integration
   - Interactive AI assistant video
   - Chat interface
   - Response simulation

4. Responsive Design
   - Mobile-friendly layout
   - Grid-based component organization
   - Adaptive spacing

## Configuration
### Theme Settings (`theme.json`)
```json
{
  "variant": "professional",
  "primary": "hsl(265, 89%, 78%)",
  "appearance": "dark",
  "radius": 0.5
}
```

### Key Dependencies
- React + TypeScript
- Express.js backend
- WebSocket for real-time updates
- TradingView chart widget
- shadcn/ui components
- Tailwind CSS

## File Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── AiChat.tsx
│   │   ├── CryptoPrice.tsx
│   │   ├── KiaraVideoWrapper.tsx
│   │   ├── Navbar.tsx
│   │   ├── PriceChart.tsx
│   │   ├── SpaceBackground.tsx
│   │   ├── SubscriptionPlans.tsx
│   │   ├── ThemeSwitcher.tsx
│   │   └── TradingChart.tsx
│   ├── pages/
│   │   ├── home.tsx
│   │   └── not-found.tsx
│   └── lib/
│       ├── websocket.ts
│       └── queryClient.ts
server/
├── index.ts
└── routes.ts
db/
├── schema.ts
└── index.ts
```

## Database Schema
```typescript
users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  wallet_address: text("wallet_address"),
  subscription_tier: text("subscription_tier").default("basic").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
```

## Known Working Features
1. Space background animation
2. Interactive AI assistant video with audio
3. Real-time crypto price display
4. Cyberpunk styling and theme switching
5. Responsive layout across devices
6. WebSocket price updates
7. Trading chart integration

## Notes for Future Reference
1. Video component uses first frame as idle state
2. WebSocket setup handles reconnection
3. Theme system supports dynamic switching
4. Database ready for user management
5. Tailwind configured for cyberpunk theme
