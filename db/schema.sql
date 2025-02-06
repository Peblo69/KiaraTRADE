-- Reset database by dropping all existing tables
DROP TABLE IF EXISTS token_holders CASCADE;
DROP TABLE IF EXISTS token_metadata CASCADE;
DROP TABLE IF EXISTS token_statistics CASCADE;
DROP TABLE IF EXISTS token_trades CASCADE;
DROP TABLE IF EXISTS tokens CASCADE;

-- Create main tokens table
CREATE TABLE tokens (
    -- Basic token info
    address TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    decimals INTEGER DEFAULT 9,
    image_url TEXT,

    -- Market data (all with defaults to avoid null issues)
    price_usd DECIMAL DEFAULT 0,
    liquidity_usd DECIMAL DEFAULT 0,
    market_cap_usd DECIMAL DEFAULT 0,
    total_supply DECIMAL DEFAULT 0,
    volume_24h DECIMAL DEFAULT 0,
    price_change_24h DECIMAL DEFAULT 0,

    -- Contract info
    bonding_curve_key TEXT,
    mint_authority TEXT,
    freeze_authority TEXT,

    -- Social links - allow NULL values
    twitter_url TEXT,
    telegram_url TEXT,
    website_url TEXT,

    -- Social metrics
    twitter_followers INTEGER DEFAULT 0,
    telegram_members INTEGER DEFAULT 0,

    -- Risk metrics
    liquidity_concentration DECIMAL DEFAULT 0,
    holder_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create token trades table (for tracking all transactions)
CREATE TABLE token_trades (
    id SERIAL PRIMARY KEY,
    token_address TEXT NOT NULL REFERENCES tokens(address),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    price_usd DECIMAL NOT NULL,
    amount_tokens DECIMAL NOT NULL,
    amount_sol DECIMAL NOT NULL,
    wallet_address TEXT NOT NULL,
    tx_signature TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'create')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create token statistics table (for market data aggregation)
CREATE TABLE token_statistics (
    id SERIAL PRIMARY KEY,
    token_address TEXT NOT NULL REFERENCES tokens(address),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    timeframe TEXT NOT NULL CHECK (timeframe IN ('1m', '5m', '15m', '1h', '4h', '1d')),
    open_price DECIMAL NOT NULL,
    high_price DECIMAL NOT NULL,
    low_price DECIMAL NOT NULL,
    close_price DECIMAL NOT NULL,
    volume DECIMAL NOT NULL DEFAULT 0,
    trade_count INTEGER NOT NULL DEFAULT 0,
    buy_count INTEGER NOT NULL DEFAULT 0,
    sell_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(token_address, timestamp, timeframe)
);

-- Create token metadata table (for additional token information)
CREATE TABLE token_metadata (
    token_address TEXT PRIMARY KEY REFERENCES tokens(address),
    description TEXT,
    verified BOOLEAN DEFAULT false,
    tags TEXT[],
    launch_date TIMESTAMP WITH TIME ZONE,
    team_info JSONB,
    audit_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create token holders table (for tracking ownership)
CREATE TABLE token_holders (
    id SERIAL PRIMARY KEY,
    token_address TEXT NOT NULL REFERENCES tokens(address),
    wallet_address TEXT NOT NULL,
    balance DECIMAL NOT NULL DEFAULT 0,
    percentage DECIMAL NOT NULL DEFAULT 0,
    first_buy_date TIMESTAMP WITH TIME ZONE,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(token_address, wallet_address)
);

-- Create indexes for better query performance
CREATE INDEX idx_tokens_symbol ON tokens(symbol);
CREATE INDEX idx_tokens_market_cap ON tokens(market_cap_usd DESC);
CREATE INDEX idx_tokens_volume ON tokens(volume_24h DESC);
CREATE INDEX idx_tokens_created ON tokens(created_at DESC);

CREATE INDEX idx_token_trades_timestamp ON token_trades(timestamp);
CREATE INDEX idx_token_trades_token_addr ON token_trades(token_address);
CREATE INDEX idx_token_trades_wallet ON token_trades(wallet_address);
CREATE INDEX idx_token_trades_signature ON token_trades(tx_signature);

CREATE INDEX idx_token_statistics_timestamp ON token_statistics(timestamp);
CREATE INDEX idx_token_statistics_token_timeframe ON token_statistics(token_address, timeframe);

CREATE INDEX idx_token_holders_balance ON token_holders(balance DESC);
CREATE INDEX idx_token_holders_percentage ON token_holders(percentage DESC);