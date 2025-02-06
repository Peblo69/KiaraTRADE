import { supabase } from './supabase';
import { TokenTrade, PumpPortalToken } from '@/lib/pump-portal-websocket';

// Enhanced logging function with detailed error reporting
function logSync(action: string, data: any, error?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[Supabase Sync][${action}]`, {
    data: {
      ...data,
      timestamp
    },
    error: error ? {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    } : null,
    timestamp
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
    const { data, error } = await supabase
      .from('token_holders')
      .select('id')
      .eq('token_address', tokenAddress)
      .gt('balance', 0);

    if (error) {
      console.error('Error calculating holder count:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error calculating holder count:', error);
    return 0;
  }
}

export async function syncTokenData(token: PumpPortalToken) {
  try {
    // Ensure we have a valid token address
    const tokenAddress = token.mint || token.address;
    if (!tokenAddress) {
      throw new Error('No valid token address provided');
    }

    // Log initial token data
    logSync('Syncing Token', {
      address: tokenAddress,
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || `Token ${tokenAddress.slice(0, 8)}`,
      metadata: token.metadata,
      socials: token.socials
    });

    // Get existing token data first
    const { data: existingToken } = await supabase
      .from('tokens')
      .select('*')
      .eq('address', tokenAddress)
      .single();

    const priceUsd = calculatePriceUsd(token);
    const liquidityUsd = (token.vSolInBondingCurve || 0) * SOL_PRICE;
    const marketCapUsd = (token.marketCapSol || 0) * SOL_PRICE;
    const holderCount = await calculateHolderCount(tokenAddress);

    // Prepare token data with all required fields
    const tokenData = {
      address: tokenAddress,
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || `Token ${tokenAddress.slice(0, 8)}`,
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
      mint_authority: token.metadata?.mint || existingToken?.mint_authority || null,
      freeze_authority: token.metadata?.freezeAuthority || existingToken?.freeze_authority || null,

      // Social links - allow NULL values
      twitter_url: token.socials?.twitter || existingToken?.twitter_url || null,
      telegram_url: token.socials?.telegram || existingToken?.telegram_url || null,
      website_url: token.socials?.website || existingToken?.website_url || null,

      // Social metrics - keep existing values if present
      twitter_followers: token.socials?.twitterFollowers || existingToken?.twitter_followers || 0,
      telegram_members: token.socials?.telegramMembers || existingToken?.telegram_members || 0,

      // Risk metrics
      liquidity_concentration: existingToken?.liquidity_concentration || 0,
      holder_count: holderCount,

      // Update timestamp
      updated_at: new Date().toISOString()
    };

    // Log prepared data before insertion
    logSync('Token Data Prepared', {
      address: tokenData.address,
      symbol: tokenData.symbol,
      metadata: {
        image_url: tokenData.image_url,
        bonding_curve: tokenData.bonding_curve_key,
        mint_authority: tokenData.mint_authority,
        freeze_authority: tokenData.freeze_authority
      },
      social_links: {
        twitter: tokenData.twitter_url,
        telegram: tokenData.telegram_url,
        website: tokenData.website_url
      },
      metrics: {
        holders: tokenData.holder_count,
        price_usd: tokenData.price_usd,
        liquidity_usd: tokenData.liquidity_usd,
        market_cap_usd: tokenData.market_cap_usd
      }
    });

    // Upsert token data
    const { error: tokenError } = await supabase
      .from('tokens')
      .upsert(tokenData, {
        onConflict: 'address',
        ignoreDuplicates: false
      });

    if (tokenError) {
      logSync('Token Sync Error', tokenData, tokenError);
      throw tokenError;
    }

    logSync('Token Sync Success', {
      address: tokenAddress,
      symbol: token.symbol
    });

    // Update holder data if we have trades
    if (token.recentTrades && token.recentTrades.length > 0) {
      await updateHolderData(token, tokenAddress);
    }

  } catch (error) {
    logSync('Token Sync Failed', token, error);
    console.error('Failed to sync token data:', error);
  }
}

async function updateHolderData(token: PumpPortalToken, tokenAddress: string) {
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
          token_address: tokenAddress,
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

export async function syncTradeData(trade: TokenTrade) {
  try {
    logSync('Syncing Trade', {
      signature: trade.signature,
      token: trade.mint,
      type: trade.txType
    });

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

    // Check if trade already exists
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

    // Insert the trade
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