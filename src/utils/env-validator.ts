import dotenv from "dotenv";
// Load environment variables
dotenv.config();

export interface EnvConfig {
  PRIV_KEY_WALLET: string;
  HELIUS_HTTPS_URI: string;
  HELIUS_WSS_URI: string;
  HELIUS_HTTPS_URI_TX: string;
  JUP_HTTPS_QUOTE_URI: string;
  JUP_HTTPS_SWAP_URI: string;
  JUP_HTTPS_PRICE_URI: string;
  DEX_HTTPS_LATEST_TOKENS: string;
}

export function validateEnv(): EnvConfig {
  const requiredEnvVars = [
    "PRIV_KEY_WALLET",
    "HELIUS_HTTPS_URI",
    "HELIUS_WSS_URI",
    "HELIUS_HTTPS_URI_TX",
    "JUP_HTTPS_QUOTE_URI",
    "JUP_HTTPS_SWAP_URI",
    "JUP_HTTPS_PRICE_URI",
    "DEX_HTTPS_LATEST_TOKENS",
  ] as const;

  const missingVars = requiredEnvVars.filter((envVar) => {
    if (envVar === "PRIV_KEY_WALLET" && !process.env[envVar]) {
      return false; // Allow PRIV_KEY_WALLET to be empty
    }
    return !process.env[envVar];
  });

  if (missingVars.length > 0) {
    throw new Error(`🚫 Missing required environment variables: ${missingVars.join(", ")}`);
  }

  const privKeyWallet = process.env.PRIV_KEY_WALLET;
  if (privKeyWallet && ![87, 88].includes(privKeyWallet.length)) {
    throw new Error(`🚫 PRIV_KEY_WALLET must be 87 or 88 characters long (got ${privKeyWallet.length})`);
  }

  function isValidUrl(urlString: string, protocol: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === protocol;
    } catch (e) {
      return false;
    }
  }

  // Validate URLs
  if (!isValidUrl(process.env.HELIUS_HTTPS_URI!, 'https:')) {
    throw new Error('🚫 HELIUS_HTTPS_URI must be a valid HTTPS URL');
  }
  if (!isValidUrl(process.env.HELIUS_WSS_URI!, 'wss:')) {
    throw new Error('🚫 HELIUS_WSS_URI must be a valid WSS URL');
  }
  if (!isValidUrl(process.env.HELIUS_HTTPS_URI_TX!, 'https:')) {
    throw new Error('🚫 HELIUS_HTTPS_URI_TX must be a valid HTTPS URL');
  }
  if (!isValidUrl(process.env.JUP_HTTPS_QUOTE_URI!, 'https:')) {
    throw new Error('🚫 JUP_HTTPS_QUOTE_URI must be a valid HTTPS URL');
  }
  if (!isValidUrl(process.env.JUP_HTTPS_SWAP_URI!, 'https:')) {
    throw new Error('🚫 JUP_HTTPS_SWAP_URI must be a valid HTTPS URL');
  }
  if (!isValidUrl(process.env.JUP_HTTPS_PRICE_URI!, 'https:')) {
    throw new Error('🚫 JUP_HTTPS_PRICE_URI must be a valid HTTPS URL');
  }
  if (!isValidUrl(process.env.DEX_HTTPS_LATEST_TOKENS!, 'https:')) {
    throw new Error('🚫 DEX_HTTPS_LATEST_TOKENS must be a valid HTTPS URL');
  }

  // Check for Helius API key presence
  const heliusUrls = [
    process.env.HELIUS_HTTPS_URI,
    process.env.HELIUS_WSS_URI,
    process.env.HELIUS_HTTPS_URI_TX
  ];

  for (const url of heliusUrls) {
    if (url) {
      try {
        const parsedUrl = new URL(url);
        const apiKey = parsedUrl.searchParams.get('api-key');
        if (!apiKey) {
          throw new Error(`🚫 Missing api-key in URL: ${url}`);
        }
      } catch (e) {
        // URL parsing error is already handled by isValidUrl
        continue;
      }
    }
  }

  return {
    PRIV_KEY_WALLET: process.env.PRIV_KEY_WALLET!,
    HELIUS_HTTPS_URI: process.env.HELIUS_HTTPS_URI!,
    HELIUS_WSS_URI: process.env.HELIUS_WSS_URI!,
    HELIUS_HTTPS_URI_TX: process.env.HELIUS_HTTPS_URI_TX!,
    JUP_HTTPS_QUOTE_URI: process.env.JUP_HTTPS_QUOTE_URI!,
    JUP_HTTPS_SWAP_URI: process.env.JUP_HTTPS_SWAP_URI!,
    JUP_HTTPS_PRICE_URI: process.env.JUP_HTTPS_PRICE_URI!,
    DEX_HTTPS_LATEST_TOKENS: process.env.DEX_HTTPS_LATEST_TOKENS!,
  };
}