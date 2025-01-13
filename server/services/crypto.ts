import axios from "axios";

interface PriceData {
  price: number;
  change24h: number;
  lastUpdated: number;
}

class CryptoService {
  private cache: Map<string, PriceData> = new Map();
  private queue: string[] = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests
  private readonly CACHE_DURATION = 300000; // 5 minutes cache
  private readonly REQUEST_TIMEOUT = 5000; // 5 seconds timeout

  async getPriceData(coinId: string): Promise<PriceData> {
    const cached = this.cache.get(coinId);
    const now = Date.now();

    // Return cache if fresh
    if (cached && now - cached.lastUpdated < this.CACHE_DURATION) {
      return cached;
    }

    // Add to queue if not already queued
    if (!this.queue.includes(coinId)) {
      this.queue.push(coinId);
      this.processQueue().catch(console.error);
    }

    // Return stale cache while waiting for update
    if (cached) {
      return cached;
    }

    // Return default values if no cache available
    return {
      price: 0,
      change24h: 0,
      lastUpdated: now
    };
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      while (this.queue.length > 0) {
        const coinId = this.queue.shift();
        if (!coinId) continue;

        try {
          // Ensure minimum time between requests
          const timeSinceLastRequest = Date.now() - this.lastRequestTime;
          if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
            await new Promise(resolve => 
              setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
            );
          }

          const response = await axios.get(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
            { 
              timeout: this.REQUEST_TIMEOUT,
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'CryptoPrice/1.0'
              }
            }
          );

          this.lastRequestTime = Date.now();

          const data = response.data[coinId];
          if (!data) {
            console.warn(`No data returned for ${coinId}`);
            continue;
          }

          this.cache.set(coinId, {
            price: data.usd,
            change24h: data.usd_24h_change,
            lastUpdated: Date.now()
          });

        } catch (error: any) {
          console.error(`Error fetching price for ${coinId}:`, {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          });

          // Handle rate limit specifically
          if (error.response?.status === 429) {
            const retryAfter = parseInt(error.response.headers['retry-after']) || 60;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          }

          // Re-queue with exponential backoff
          setTimeout(() => {
            if (!this.queue.includes(coinId)) {
              this.queue.push(coinId);
            }
          }, this.MIN_REQUEST_INTERVAL * 2);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  getActiveSymbols(): string[] {
    return Array.from(this.cache.keys());
  }

  getCacheStatus() {
    return {
      cacheSize: this.cache.size,
      queueLength: this.queue.length,
      isProcessing: this.isProcessingQueue,
      lastRequestTime: this.lastRequestTime,
      cacheAge: Math.floor((Date.now() - this.lastRequestTime) / 1000)
    };
  }
}

export const cryptoService = new CryptoService();