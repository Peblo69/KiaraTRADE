import axios from 'axios';
import { RugResponseExtended } from '@/types';

const RUGCHECK_API_BASE = 'https://api.rugcheck.xyz/v1/tokens';

export class RugcheckService {
  async getTokenReport(mintAddress: string): Promise<RugResponseExtended | null> {
    try {
      console.log(`[RugCheck] Getting report for token ${mintAddress}`);
      
      const response = await axios.get<RugResponseExtended>(
        `${RUGCHECK_API_BASE}/${mintAddress}/report/summary`,
        {
          headers: {
            'accept': 'application/json'
          }
        }
      );

      if (!response.data) {
        throw new Error('No data received from RugCheck API');
      }

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
