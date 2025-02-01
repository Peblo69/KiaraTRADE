export const HELIUS_CONFIG = {
    API_KEY: process.env.VITE_HELIUS_API_KEY,
    WS_URL: `wss://rpc.helius.xyz/?api-key=${process.env.VITE_HELIUS_API_KEY}`,
    REST_URL: 'https://api.helius.xyz/v0'
};

// Validate config
if (!process.env.VITE_HELIUS_API_KEY) {
    console.error('❌ [HELIUS] Missing API key! Make sure VITE_HELIUS_API_KEY is set in your environment');
}