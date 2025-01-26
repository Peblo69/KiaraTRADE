import axios from 'axios';
import { RugResponseExtended } from '../Solana Sniper/src/types';

const RUGCHECK_API_BASE = 'https://api.rugcheck.xyz/v1/tokens';
const CACHE_DURATION = 10000; // 10 seconds cache
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

interface CacheEntry {
  data: RugResponseExtended;
  timestamp: number;
}

export class RugcheckService {
  private cache: Map<string, CacheEntry> = new Map();
  private lastRequestTime: number = 0;

  async getTokenReport(mintAddress: string): Promise<RugResponseExtended | null> {
    try {
      // Check cache first
      const cached = this.cache.get(mintAddress);
      const now = Date.now();

      if (cached && (now - cached.timestamp < CACHE_DURATION)) {
        console.log(`[RugCheck] Using cached data for ${mintAddress}`);
        return cached.data;
      }

      // Implement rate limiting
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }

      console.log(`[RugCheck] Getting report for token ${mintAddress}`);

      const response = await axios.get<RugResponseExtended>(
        `${RUGCHECK_API_BASE}/${mintAddress}/report/summary`,
        {
          headers: {
            'accept': 'application/json'
          }
        }
      );

      this.lastRequestTime = Date.now();

      if (!response.data) {
        throw new Error('No data received from RugCheck API');
      }

      // Cache the result
      this.cache.set(mintAddress, {
        data: response.data,
        timestamp: now
      });

      console.log(`[RugCheck] Received report for ${mintAddress}:`, {
        score: response.data.score,
        risks: response.data.risks?.length || 0
      });

      return response.data;
    } catch (error: any) {
      console.error('[RugCheck] Error fetching token report:', {
        mint: mintAddress,
        error: error.message,
        response: error.response?.data
      });
      return null;
    }
  }

  getRiskEmoji(score: number): string {
    if (score >= 800) return '🚨'; // High risk
    if (score >= 500) return '⚠️'; // Medium risk
    return '✅'; // Low risk
  }

  getDetailedRiskInfo(data: RugResponseExtended) {
    const indicators = [];

    // Token authority risks
    if (data.mintAuthority) indicators.push('🔑'); // Has mint authority
    if (data.freezeAuthority) indicators.push('❄️'); // Has freeze authority

    // Liquidity risks
    if (data.totalMarketLiquidity < 1000) indicators.push('💧'); // Low liquidity

    // Holder concentration risks
    const topHolderPct = data.topHolders?.[0]?.pct || 0;
    if (topHolderPct > 50) indicators.push('🐋'); // Whale concentration

    return indicators.join(' ');
  }
}

export const rugcheckService = new RugcheckService();