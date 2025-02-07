
import axios from 'axios';

const KUCOIN_API_BASE = 'https://api.kucoin.com/api/v1';

interface MarketContext {
  price: {
    current: number;
    change24h: number;
    high24h: number;
    low24h: number;
  };
  volume: {
    total24h: number;
    change24h: number;
  };
  marketCap: number;
  liquidity: number;
}

class CryptoService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly API_BASE = KUCOIN_API_BASE;

  async getMarketContext(symbol: string): Promise<MarketContext> {
    try {
      const response = await axios.get(`${this.API_BASE}/market/stats`, {
        params: { symbol }
      });

      const data = response.data.data;
      
      return {
        price: {
          current: parseFloat(data.last),
          change24h: parseFloat(data.changeRate) * 100,
          high24h: parseFloat(data.high),
          low24h: parseFloat(data.low)
        },
        volume: {
          total24h: parseFloat(data.vol),
          change24h: parseFloat(data.volValue)
        },
        marketCap: parseFloat(data.volValue) * parseFloat(data.last),
        liquidity: parseFloat(data.vol) * parseFloat(data.last)
      };
    } catch (error) {
      console.error('[CryptoService] Error getting market context:', error);
      throw error;
    }
  }
}

export const cryptoService = new CryptoService();
