// src/lib/config.ts
import { format } from 'date-fns';

export const CONFIG = {
  // Time and User
  CURRENT_TIME: "2025-01-27 18:03:54",
  CURRENT_USER: "Peblo69",

  // WebSocket Settings
  WS_RECONNECT_INTERVAL: 1000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  WS_HEARTBEAT_INTERVAL: 30000,

  // RPC Endpoints
  RPC_ENDPOINTS: [
    "https://solana-mainnet.g.alchemy.com/v2/demo",
    "https://api.mainnet-beta.solana.com",
    "https://solana-api.projectserum.com",
    "https://rpc.ankr.com/solana"
  ],

  // Debug Settings
  DEBUG: true,
  LOG_LEVEL: 'debug',

  // API Keys
  HELIUS_API_KEY: import.meta.env.VITE_HELIUS_API_KEY,
  BITQUERY_API_KEY: import.meta.env.VITE_BITQUERY_API_KEY,

  // Time Functions
  getCurrentTime: () => format(new Date(), "yyyy-MM-dd HH:mm:ss"),
  formatTime: (date: Date) => format(date, "yyyy-MM-dd HH:mm:ss"),
};

// Debug Logger
export const debugLog = (component: string, action: string, data?: any) => {
  if (CONFIG.DEBUG) {
    console.log(`[DEBUG][${component}][${action}]`, {
      ...data,
      time: CONFIG.CURRENT_TIME,
      user: CONFIG.CURRENT_USER
    });
  }
};

// Error Logger
export const errorLog = (component: string, error: any, context?: any) => {
  console.error(`[ERROR][${component}]`, {
    error,
    context,
    time: CONFIG.CURRENT_TIME,
    user: CONFIG.CURRENT_USER
  });
};

export default CONFIG;