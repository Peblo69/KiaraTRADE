export const HELIUS_CONFIG = {
    API_KEY: process.env.NEXT_PUBLIC_HELIUS_API_KEY,
    WS_URL: `wss://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`,
    REST_URL: `https://api.helius.xyz/v0`
};
