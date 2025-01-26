export const config = {
  liquidity_pool: {
    radiyum_program_id: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    wsol_pc_mint: "So11111111111111111111111111111111111111112",
  },
  tx: {
    fetch_tx_max_retries: 10,
    fetch_tx_initial_delay: 3000, // Initial delay before fetching LP creation transaction details (3 seconds)
    swap_tx_initial_delay: 1000, // Initial delay before first buy (1 second)
    get_timeout: 10000, // Timeout for API requests
    concurrent_transactions: 1, // Number of simultaneous transactions
    retry_delay: 500, // Delay between retries (0.5 seconds)
  },
  swap: {
    verbose_log: true, // Set to true for testing
    prio_fee_max_lamports: 100000, // 0.0001 SOL max priority fee
    prio_level: "high", // Changed from veryHigh to high for testing
    amount: "10000000", // 0.01 SOL maximum per trade
    slippageBps: "200", // 2% slippage tolerance
    token_not_tradable_400_error_retries: 3,
    token_not_tradable_400_error_delay: 2000,
  },
  sell: {
    price_source: "dex",
    prio_fee_max_lamports: 100000, // 0.0001 SOL max priority fee
    prio_level: "high",
    slippageBps: "200", // 2%
    auto_sell: true, // Enable auto-sell for testing
    stop_loss_percent: 5, // 5% stop loss
    take_profit_percent: 20, // 20% take profit (reduced from 50%)
    track_public_wallet: "", // Will be set to your public key
  },
  rug_check: {
    verbose_log: true,
    simulation_mode: true,
    // Dangerous
    allow_mint_authority: false,
    allow_not_initialized: false,
    allow_freeze_authority: false,
    allow_rugged: false,
    // Critical
    allow_mutable: false,
    block_returning_token_names: true,
    block_returning_token_creators: true,
    block_symbols: ["XXX"],
    block_names: ["XXX"],
    allow_insider_topholders: false,
    max_alowed_pct_topholders: 1,
    exclude_lp_from_topholders: true,
    // Warning
    min_total_markets: 1, // Reduced for testing
    min_total_lp_providers: 1, // Reduced for testing
    min_total_market_Liquidity: 10000, // Reduced minimum liquidity requirement
    // Misc
    ignore_pump_fun: true,
    max_score: 1,
    legacy_not_allowed: [
      "Low Liquidity",
      "Single holder ownership",
      "High holder concentration",
      "Freeze Authority still enabled",
      "Large Amount of LP Unlocked",
      "Copycat token",
      "Low amount of LP Providers",
    ],
  },
};