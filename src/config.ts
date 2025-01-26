import dotenv from "dotenv";
dotenv.config();

export const config = {
  liquidity_pool: {
    radiyum_program_id: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  },
  tx: {
    concurrent_transactions: 3,
    swap_tx_initial_delay: 0,
    swap_tx_error_retry_count: 3,
    swap_tx_error_retry_delay: 1000,
    min_volume_sol: 0,
    max_volume_sol: 100,
  },
  rug_check: {
    enabled: true,
    max_score: 100,
    ignore_pump_fun: true,
    simulation_mode: false,
    exclude_lp_from_topholders: true,
  },
  verbose: true
};
