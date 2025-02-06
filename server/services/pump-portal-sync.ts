import { supabase } from './supabase';
import { TokenTrade, PumpPortalToken } from '@/lib/pump-portal-websocket';

// Enhanced logging function
function logSync(action: string, data: any, error?: any) {
  console.log(`[Supabase Sync][${action}]`, {
    data: {
      ...data,
      timestamp: new Date().toISOString()
    },
    error: error ? error.message : null,
    timestamp: new Date().toISOString()
  });
}

// Get SOL price from environment or use a default
const SOL_PRICE = 196.05; // We should get this dynamically from the store

// Calculate price in USD, ensuring we never return null
function calculatePriceUsd(trade: any): number {
  // If we have a direct USD price, use it
  if (trade.priceInUsd && trade.priceInUsd > 0) {
    return trade.priceInUsd;
  }

  // If we have SOL price, convert it
  if (trade.priceInSol && trade.priceInSol > 0) {
    return trade.priceInSol * SOL_PRICE;
  }

  // Calculate from amounts if available
  if (trade.solAmount && trade.tokenAmount && trade.tokenAmount > 0) {
    return (trade.solAmount / trade.tokenAmount) * SOL_PRICE;
  }

  // Fallback to calculating from market cap and supply
  if (trade.marketCapSol && trade.vTokensInBondingCurve && trade.vTokensInBondingCurve > 0) {
    return (trade.marketCapSol * SOL_PRICE) / trade.vTokensInBondingCurve;
  }

  // Absolute fallback to prevent null values
  return 0.000001;
}

// Sync social metrics if available
async function syncSocialMetrics(token: PumpPortalToken) {
  try {
    // Skip if we don't have a valid token address
    if (!token.mint && !token.address) {
      return;
    }

    // Only sync if we have any social links
    if (!token.socials?.twitter && !token.socials?.telegram && !token.socials?.website && 
        !token.twitter && !token.telegram && !token.website) {
      return;
    }

    const metricsData = {
      token_address: token.mint || token.address,
      twitter_url: token.socials?.twitter || token.twitter || null,
      telegram_url: token.socials?.telegram || token.telegram || null,
      website_url: token.socials?.website || token.website || null,
      updated_at: new Date().toISOString()
    };

    // First try to insert
    const { error: insertError } = await supabase
      .from('social_metrics')
      .insert(metricsData);

    // If insert fails due to duplicate, try update
    if (insertError) {
      const { error: updateError } = await supabase
        .from('social_metrics')
        .update({
          twitter_url: metricsData.twitter_url,
          telegram_url: metricsData.telegram_url,
          website_url: metricsData.website_url,
          updated_at: metricsData.updated_at
        })
        .eq('token_address', metricsData.token_address);

      if (updateError) {
        logSync('Social Metrics Update Error', { metrics: metricsData }, updateError);
        throw updateError;
      }
    }

    logSync('Social Metrics Sync Success', {
      address: token.mint || token.address,
      twitter: metricsData.twitter_url,
      telegram: metricsData.telegram_url,
      website: metricsData.website_url
    });

    return metricsData;
  } catch (error) {
    logSync('Social Metrics Sync Failed', token, error);
    throw error;
  }
}

export async function syncTokenData(token: PumpPortalToken) {
  try {
    logSync('Syncing Token', {
      address: token.mint || token.address, // Use mint as fallback for address
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || `Token ${token.address?.slice(0, 8) || token.mint?.slice(0, 8)}`
    });

    const priceUsd = calculatePriceUsd(token);
    const liquidityUsd = (token.vSolInBondingCurve || 0) * SOL_PRICE;
    const marketCapUsd = (token.marketCapSol || 0) * SOL_PRICE;

    // Fetch existing token data
    const { data: existingToken } = await supabase
      .from('tokens')
      .select('address, initial_price_usd, created_at')
      .eq('address', token.mint || token.address) // Use mint as fallback
      .single();

    const tokenData = {
      address: token.mint || token.address, // Use mint as fallback
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || `Token ${token.mint?.slice(0, 8)}`,
      decimals: token.metadata?.decimals || 9,
      image_url: token.metadata?.image || token.imageUrl,
      initial_price_usd: existingToken?.initial_price_usd || priceUsd,
      initial_liquidity_usd: liquidityUsd,
      current_price_usd: priceUsd,
      market_cap_usd: marketCapUsd,
      bonding_curve_key: token.bondingCurveKey,
      mint_authority: token.devWallet,
      freeze_authority: token.devWallet,
      supply: token.vTokensInBondingCurve || 0,
      created_at: existingToken?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Upsert token data
    const { error: tokenError } = await supabase
      .from('tokens')
      .upsert(tokenData, {
        onConflict: 'address',
        ignoreDuplicates: false
      });

    if (tokenError) {
      logSync('Token Sync Error', token, tokenError);
      throw tokenError;
    }

    logSync('Token Sync Success', {
      address: token.address,
      symbol: token.symbol
    });

    // Sync metadata
    if (token.metadata || token.socials || token.twitter || token.telegram || token.website) {
      const metadataData = {
        token_address: token.mint || token.address,
        twitter_url: token.socials?.twitter || token.twitter,
        telegram_url: token.socials?.telegram || token.telegram,
        website_url: token.socials?.website || token.website,
        description: token.metadata?.description || null,
        updated_at: new Date().toISOString()
      };

      const { error: metadataError } = await supabase
        .from('token_metadata')
        .upsert(metadataData, {
          onConflict: 'token_address',
          ignoreDuplicates: false
        });

      if (metadataError) {
        logSync('Metadata Sync Error', { metadata: token.metadata, socials: token.socials }, metadataError);
      } else {
        logSync('Metadata Sync Success', { address: token.address });
      }

      // Always try to sync social metrics
      await syncSocialMetrics(token);

    }

    // Update token holders
    if (token.recentTrades && token.recentTrades.length > 0) {
      const holders = new Map<string, number>();

      // Calculate current holdings for each wallet
      token.recentTrades.forEach(trade => {
        const amount = trade.tokenAmount || 0;
        const wallet = trade.traderPublicKey;
        const currentHolding = holders.get(wallet) || 0;

        if (trade.txType === 'buy') {
          holders.set(wallet, currentHolding + amount);
        } else {
          const newAmount = currentHolding - amount;
          if (newAmount > 0) {
            holders.set(wallet, newAmount);
          } else {
            holders.delete(wallet);
          }
        }
      });

      // Convert Map entries to array and update holder data
      const holderEntries = Array.from(holders.entries());
      const totalSupply = token.vTokensInBondingCurve || 1;

      for (const [wallet, balance] of holderEntries) {
        const percentage = (balance / totalSupply) * 100;
        const holderData = {
          token_address: token.mint || token.address,
          wallet_address: wallet,
          balance: balance,
          percentage: percentage,
          last_updated: new Date().toISOString()
        };

        const { error: holderError } = await supabase
          .from('token_holders')
          .upsert(holderData, {
            onConflict: 'token_address,wallet_address',
            ignoreDuplicates: false
          });

        if (holderError) {
          logSync('Holder Sync Error', { wallet, balance }, holderError);
        } else {
          logSync('Holder Sync Success', { address: token.address, wallet });
        }
      }
    }

  } catch (error) {
    logSync('Token Sync Failed', token, error);
    console.error('Failed to sync token data:', error);
  }
}

export async function syncTradeData(trade: TokenTrade) {
  try {
    logSync('Syncing Trade', {
      signature: trade.signature,
      token: trade.mint,
      type: trade.txType
    });

    const { data: existingTrade } = await supabase
      .from('token_trades')
      .select('tx_signature')
      .eq('tx_signature', trade.signature)
      .single();

    if (existingTrade) {
      logSync('Trade already exists', { signature: trade.signature });
      return;
    }

    const priceUsd = calculatePriceUsd(trade);

    // First ensure the token exists
    await syncTokenData({
      address: trade.mint,
      symbol: 'UNKNOWN',
      name: `Token ${trade.mint.slice(0, 8)}`,
      bondingCurveKey: trade.bondingCurveKey,
      vTokensInBondingCurve: trade.vTokensInBondingCurve,
      vSolInBondingCurve: trade.vSolInBondingCurve,
      marketCapSol: trade.marketCapSol,
      priceInSol: trade.priceInSol,
      priceInUsd: priceUsd,
      recentTrades: []
    });

    // Then insert the trade
    const { error } = await supabase
      .from('token_trades')
      .insert({
        token_address: trade.mint,
        timestamp: new Date(trade.timestamp).toISOString(),
        price_usd: priceUsd,
        amount_tokens: trade.tokenAmount || 0,
        amount_sol: trade.solAmount || 0,
        wallet_address: trade.traderPublicKey,
        tx_signature: trade.signature,
        type: trade.txType,
        created_at: new Date().toISOString()
      });

    if (error) {
      logSync('Trade Sync Error', trade, error);
      throw error;
    }

    // Update token statistics
    const { error: statsError } = await supabase
      .from('token_statistics')
      .insert({
        token_address: trade.mint,
        timestamp: new Date(trade.timestamp).toISOString(),
        timeframe: '1m',
        open_price: priceUsd,
        high_price: priceUsd,
        low_price: priceUsd,
        close_price: priceUsd,
        volume: (trade.tokenAmount || 0) * priceUsd,
        trade_count: 1,
        buy_count: trade.txType === 'buy' ? 1 : 0,
        sell_count: trade.txType === 'sell' ? 1 : 0,
        created_at: new Date().toISOString()
      });

    if (statsError) {
      logSync('Stats Sync Error', trade, statsError);
    }

    logSync('Trade Sync Success', {
      signature: trade.signature,
      token: trade.mint
    });
  } catch (error) {
    logSync('Trade Sync Failed', trade, error);
    console.error('Failed to sync trade data:', error);
  }
}

// Initialize Supabase subscriptions for real-time updates
export function initializeSupabaseSubscriptions(onTokenUpdate: (token: any) => void, onNewTrade: (trade: any) => void) {
  // Subscribe to token updates
  supabase
    .channel('tokens_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tokens' },
      (payload) => onTokenUpdate(payload.new)
    )
    .subscribe();

  // Subscribe to new trades
  supabase
    .channel('trades_changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'token_trades' },
      (payload) => onNewTrade(payload.new)
    )
    .subscribe();
}