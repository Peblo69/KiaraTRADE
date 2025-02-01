import { WalletProfile } from '../types/wallet-profile';
import { usePumpPortalStore } from '../lib/pump-portal-websocket';

export class WalletProfiler {
  private static instance: WalletProfiler;
  private cache: Map<string, WalletProfile> = new Map();

  // Make it a singleton
  public static getInstance(): WalletProfiler {
    if (!WalletProfiler.instance) {
      WalletProfiler.instance = new WalletProfiler();
    }
    return WalletProfiler.instance;
  }

  public async profileWallet(address: string): Promise<WalletProfile> {
    // Check cache first
    if (this.cache.has(address)) {
      return this.cache.get(address)!;
    }

    // Get token info from store
    const store = usePumpPortalStore.getState();
    const activeToken = store.getToken(store.activeTokenView || '');
    if (!activeToken) return this.getDefaultProfile(address);

    const trades = activeToken.recentTrades.filter(
      t => t.traderPublicKey === address
    );

    const profile = {
      type: 'unknown' as const,
      confidence: 0,
      traits: [] as string[],
      stats: {
        totalVolume: trades.reduce((sum, t) => sum + t.solAmount, 0),
        tradeCount: trades.length,
        avgTradeSize: trades.length ? trades.reduce((sum, t) => sum + t.solAmount, 0) / trades.length : 0,
        lastActive: trades.length ? new Date(Math.max(...trades.map(t => t.timestamp))) : new Date(),
        firstSeen: trades.length ? new Date(Math.min(...trades.map(t => t.timestamp))) : new Date()
      }
    };

    // Profile analysis
    if (profile.stats.totalVolume > 100) {
      profile.type = 'whale';
      profile.confidence = 80;
      profile.traits.push('high_volume');
    } else if (profile.stats.avgTradeSize < 0.1 && profile.stats.tradeCount > 50) {
      profile.type = 'bot';
      profile.confidence = 75;
      profile.traits.push('high_frequency');
      profile.traits.push('small_trades');
    } else if (profile.stats.tradeCount < 3) {
      profile.type = 'paper';
      profile.confidence = 60;
      profile.traits.push('new_trader');
    }

    // Cache it
    this.cache.set(address, profile);
    store.addWalletProfile(address, profile);

    return profile;
  }

  private getDefaultProfile(address: string): WalletProfile {
    return {
      type: 'unknown',
      confidence: 0,
      traits: [],
      stats: {
        totalVolume: 0,
        tradeCount: 0,
        avgTradeSize: 0,
        lastActive: new Date(),
        firstSeen: new Date()
      }
    };
  }
}