/*
  # Trading Platform Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `wallets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `address` (text)
      - `balance` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `trades`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `wallet_id` (uuid, foreign key)
      - `type` (text)
      - `side` (text)
      - `amount` (numeric)
      - `price` (numeric)
      - `total` (numeric)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `order_book`
      - `id` (uuid, primary key)
      - `price` (numeric)
      - `amount` (numeric)
      - `side` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wallets table
CREATE TABLE wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  address text NOT NULL,
  balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trades table
CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('market', 'limit')),
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  amount numeric NOT NULL,
  price numeric NOT NULL,
  total numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_book table
CREATE TABLE order_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price numeric NOT NULL,
  amount numeric NOT NULL,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_book ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read own wallets" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read order book" ON order_book
  FOR SELECT TO authenticated USING (true);

-- Create functions for trade operations
CREATE OR REPLACE FUNCTION create_trade(
  p_user_id uuid,
  p_wallet_id uuid,
  p_type text,
  p_side text,
  p_amount numeric,
  p_price numeric
) RETURNS uuid AS $$
DECLARE
  v_total numeric;
  v_trade_id uuid;
BEGIN
  -- Calculate total
  v_total := p_amount * p_price;
  
  -- Insert trade
  INSERT INTO trades (
    user_id, wallet_id, type, side, amount, price, total, status
  ) VALUES (
    p_user_id, p_wallet_id, p_type, p_side, p_amount, p_price, v_total, 'pending'
  ) RETURNING id INTO v_trade_id;
  
  RETURN v_trade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;