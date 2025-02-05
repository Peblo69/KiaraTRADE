import { supabase } from './supabase';
import { TokenTrade, PumpPortalToken } from '@/lib/pump-portal-websocket';

// Sync token data with Supabase
export async function syncTokenData(token: PumpPortalToken) {
  try {
    const { error } = await supabase
      .from('tokens')
      .upsert({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        current_price_usd: token.priceInUsd,
        market_cap_usd: token.marketCapSol * (token.priceInUsd || 0),
        liquidity_sol: token.vSolInBondingCurve,
        tokens_in_curve: token.vTokensInBondingCurve,
        image_url: token.metadata?.imageUrl,
        dev_wallet: token.devWallet,
        uri: token.metadata?.uri,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'address'
      });

    if (error) {
      console.error('Error syncing token data:', error);
    }
  } catch (error) {
    console.error('Failed to sync token data:', error);
  }
}

// Sync trade data with Supabase
export async function syncTradeData(trade: TokenTrade) {
  try {
    const { error } = await supabase
      .from('token_trades')
      .insert({
        token_address: trade.mint,
        price_usd: trade.priceInUsd,
        amount_tokens: trade.tokenAmount,
        amount_sol: trade.solAmount,
        wallet_address: trade.traderPublicKey,
        tx_signature: trade.signature,
        type: trade.txType,
        timestamp: new Date(trade.timestamp).toISOString(),
        bonding_curve_key: trade.bondingCurveKey,
        v_tokens_in_curve: trade.vTokensInBondingCurve,
        v_sol_in_curve: trade.vSolInBondingCurve,
        market_cap_sol: trade.marketCapSol,
        is_dev_trade: trade.isDevTrade
      });

    if (error) {
      console.error('Error syncing trade data:', error);
    }
  } catch (error) {
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
