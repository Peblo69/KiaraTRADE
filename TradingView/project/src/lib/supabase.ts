import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Trade functions
export async function createTrade(data: {
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  walletId: string;
}) {
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Not authenticated');

  const { data: trade, error } = await supabase
    .rpc('create_trade', {
      p_user_id: user.data.user.id,
      p_wallet_id: data.walletId,
      p_type: data.type,
      p_side: data.side,
      p_amount: data.amount,
      p_price: data.price
    });

  if (error) throw error;
  return trade;
}

// Order book functions
export async function getOrderBook() {
  const { data, error } = await supabase
    .from('order_book')
    .select('*')
    .order('price', { ascending: false });

  if (error) throw error;
  return data;
}

// Trade history functions
export async function getTradeHistory() {
  const { data, error } = await supabase
    .from('trades')
    .select(`
      *,
      wallets (
        address
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

// Wallet functions
export async function getWallets() {
  const { data, error } = await supabase
    .from('wallets')
    .select('*');

  if (error) throw error;
  return data;
}