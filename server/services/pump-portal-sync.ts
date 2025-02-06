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

async function calculateHolderCount(tokenAddress: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('token_holders')
      .select('count')
      .eq('token_address', tokenAddress)
      .gt('balance', 0)
      .single();

    return count || 0;
  } catch (error) {
    console.error('Error calculating holder count:', error);
    return 0;
  }
}

export async function syncTokenData(token: PumpPortalToken) {
  try {
    logSync('Syncing Token', {
      address: token.address || token.mint,
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || `Token ${(token.address || token.mint)?.slice(0, 8)}`
    });

    const priceUsd = calculatePriceUsd(token);
    const liquidityUsd = (token.vSolInBondingCurve || 0) * SOL_PRICE;
    const marketCapUsd = (token.marketCapSol || 0) * SOL_PRICE;
    const holderCount = await calculateHolderCount(token.address || token.mint);

    // Get existing token data first
    const { data: existingToken } = await supabase
      .from('tokens')
      .select('*')
      .eq('address', token.address || token.mint)
      .single();

    // Prepare token data with all required fields
    const tokenData = {
      address: token.address || token.mint,
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || `Token ${(token.address || token.mint)?.slice(0, 8)}`,
      decimals: token.metadata?.decimals || 9,
      image_url: token.metadata?.imageUrl || token.imageUrl || null,
      price_usd: priceUsd,
      liquidity_usd: liquidityUsd,
      market_cap_usd: marketCapUsd,
      total_supply: token.vTokensInBondingCurve || 0,
      volume_24h: existingToken?.volume_24h || 0,
      price_change_24h: existingToken?.price_change_24h || 0,

      // Contract info - keep existing values if present
      bonding_curve_key: token.bondingCurveKey || existingToken?.bonding_curve_key || null,
      mint_authority: token.devWallet || existingToken?.mint_authority || null,
      freeze_authority: token.freezeAuthority || existingToken?.freeze_authority || null,

      // Social links - keep existing values if present
      twitter_url: token.socials?.twitter || token.twitter || existingToken?.twitter_url || null,
      telegram_url: token.socials?.telegram || token.telegram || existingToken?.telegram_url || null,
      website_url: token.socials?.website || token.website || existingToken?.website_url || null,

      // Social metrics - keep existing values if present
      twitter_followers: token.socials?.twitterFollowers || existingToken?.twitter_followers || 0,
      telegram_members: token.socials?.telegramMembers || existingToken?.telegram_members || 0,

      // Risk metrics
      liquidity_concentration: existingToken?.liquidity_concentration || 0,
      holder_count: holderCount,

      // Update timestamp
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
      address: token.address || token.mint,
      symbol: token.symbol
    });

    // Update holder data if we have trades
    if (token.recentTrades && token.recentTrades.length > 0) {
      const holders = new Map<string, number>();

      // Calculate current holdings for each wallet
      token.recentTrades.forEach(trade => {
        const amount = trade.tokenAmount || 0;
        const wallet = trade.traderPublicKey;
        const currentHolding = holders.get(wallet) || 0;

        if (trade.txType === 'buy') {
          holders.set(wallet, currentHolding + amount);
        } else if (trade.txType === 'sell') {
          const newAmount = currentHolding - amount;
          if (newAmount > 0) {
            holders.set(wallet, newAmount);
          } else {
            holders.delete(wallet);
          }
        }
      });

      // Update holder records
      for (const [wallet, balance] of holders.entries()) {
        if (balance > 0) {
          const percentage = (balance / (token.vTokensInBondingCurve || 1)) * 100;

          const { error: holderError } = await supabase
            .from('token_holders')
            .upsert({
              token_address: token.address || token.mint,
              wallet_address: wallet,
              balance: balance,
              percentage: percentage,
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'token_address,wallet_address'
            });

          if (holderError) {
            logSync('Holder Update Error', { wallet, balance }, holderError);
          }
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
      priceInSol: trade.priceInSol
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

    // Extract social links with fallbacks
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