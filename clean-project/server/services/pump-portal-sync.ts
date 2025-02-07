import { supabase } from './supabase';
import { TokenTrade, PumpPortalToken } from '@/lib/pump-portal-websocket';

// Internal helper functions
function emptyToNull(value: string | undefined | null): string | null {
  if (!value || value.trim() === '') {
    return null;
  }
  return value;
}

// Get SOL price from environment or use a default
const SOL_PRICE = 196.05;

// Calculate price in USD, ensuring we never return null
function calculatePriceUsd(trade: any): number {
  if (trade.priceInUsd && trade.priceInUsd > 0) {
    return trade.priceInUsd;
  }

  if (trade.priceInSol && trade.priceInSol > 0) {
    return trade.priceInSol * SOL_PRICE;
  }

  if (trade.solAmount && trade.tokenAmount && trade.tokenAmount > 0) {
    return (trade.solAmount / trade.tokenAmount) * SOL_PRICE;
  }

  if (trade.marketCapSol && trade.vTokensInBondingCurve && trade.vTokensInBondingCurve > 0) {
    return (trade.marketCapSol * SOL_PRICE) / trade.vTokensInBondingCurve;
  }

  return 0.000001;
}

async function calculateHolderCount(tokenAddress: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('token_holders')
      .select('id')
      .eq('token_address', tokenAddress)
      .gt('balance', 0);

    return data?.length || 0;
  } catch {
    return 0;
  }
}

export async function syncTokenData(token: PumpPortalToken) {
  try {
    const tokenAddress = token.mint || token.address;
    if (!tokenAddress) {
      return;
    }

    const socialLinks = {
      twitter: emptyToNull(token.socials?.twitter || token.twitter),
      telegram: emptyToNull(token.socials?.telegram || token.telegram),
      website: emptyToNull(token.socials?.website || token.website)
    };

    const imageUrl = emptyToNull(token.metadata?.imageUrl || token.imageUrl);

    const { data: existingToken } = await supabase
      .from('tokens')
      .select('*')
      .eq('address', tokenAddress)
      .single();

    const priceUsd = calculatePriceUsd(token);
    const liquidityUsd = (token.vSolInBondingCurve || 0) * SOL_PRICE;
    const marketCapUsd = (token.marketCapSol || 0) * SOL_PRICE;
    const holderCount = await calculateHolderCount(tokenAddress);

    const tokenData = {
      address: tokenAddress,
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || `Token ${tokenAddress.slice(0, 8)}`,
      decimals: token.metadata?.decimals || 9,
      image_url: imageUrl || '',
      price_usd: priceUsd,
      liquidity_usd: liquidityUsd,
      market_cap_usd: marketCapUsd,
      total_supply: token.vTokensInBondingCurve || 0,
      volume_24h: existingToken?.volume_24h || 0,
      price_change_24h: existingToken?.price_change_24h || 0,
      bonding_curve_key: token.bondingCurveKey || existingToken?.bonding_curve_key,
      mint_authority: token.metadata?.mint || existingToken?.mint_authority,
      freeze_authority: existingToken?.freeze_authority,
      twitter_url: socialLinks.twitter || '',
      telegram_url: socialLinks.telegram || '',
      website_url: socialLinks.website || '',
      twitter_followers: token.socials?.twitterFollowers || existingToken?.twitter_followers || 0,
      telegram_members: token.socials?.telegramMembers || existingToken?.telegram_members || 0,
      liquidity_concentration: existingToken?.liquidity_concentration || 0,
      holder_count: holderCount,
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('tokens')
      .upsert(tokenData, {
        onConflict: 'address',
        ignoreDuplicates: false
      });

    if (token.recentTrades && token.recentTrades.length > 0) {
      await updateHolderData(token, tokenAddress);
    }

  } catch (error) {
    // Silent error handling for production
  }
}

async function updateHolderData(token: PumpPortalToken, tokenAddress: string) {
  const holders = new Map<string, number>();

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

  for (const [wallet, balance] of holders.entries()) {
    if (balance > 0) {
      const percentage = (balance / (token.vTokensInBondingCurve || 1)) * 100;

      await supabase
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
    }
  }
}

export async function syncTradeData(trade: TokenTrade) {
  try {
    await syncTokenData({
      address: trade.mint,
      symbol: 'UNKNOWN',
      name: `Token ${trade.mint.slice(0, 8)}`,
      bondingCurveKey: trade.bondingCurveKey,
      vTokensInBondingCurve: trade.vTokensInBondingCurve,
      vSolInBondingCurve: trade.vSolInBondingCurve,
      marketCapSol: trade.marketCapSol,
      priceInSol: trade.priceInSol,
      recentTrades: []
    });

    const { data: existingTrade } = await supabase
      .from('token_trades')
      .select('tx_signature')
      .eq('tx_signature', trade.signature)
      .single();

    if (existingTrade) {
      return;
    }

    const priceUsd = calculatePriceUsd(trade);

    await supabase
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

  } catch {
    // Silent error handling for production
  }
}

export function initializeSupabaseSubscriptions(onTokenUpdate: (token: any) => void, onNewTrade: (trade: any) => void) {
  supabase
    .channel('tokens_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tokens' },
      (payload) => onTokenUpdate(payload.new)
    )
    .subscribe();

  supabase
    .channel('trades_changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'token_trades' },
      (payload) => onNewTrade(payload.new)
    )
    .subscribe();
}