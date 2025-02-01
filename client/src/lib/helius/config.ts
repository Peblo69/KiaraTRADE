export const HELIUS_CONFIG = {
  API_KEY: import.meta.env.VITE_HELIUS_API_KEY!,
  WS_URL: `wss://rpc.helius.xyz/?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`,
  API_URL: 'https://api.helius.xyz/v0'
};
