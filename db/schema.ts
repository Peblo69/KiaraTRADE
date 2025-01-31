import { pgTable, text, serial, timestamp, boolean, integer, decimal, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  verification_token: text("verification_token"),
  email_verified: boolean("email_verified").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  verification_token: z.string().optional(),
  email_verified: z.boolean().default(false),
});

export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = z.infer<typeof selectUserSchema>;

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  price_sol: decimal("price_sol", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  features: text("features").array().notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  plan_id: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: text("status").default("active").notNull(), // active, expired, cancelled
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentHistory = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  subscription_id: integer("subscription_id").references(() => subscriptions.id).notNull(),
  amount_sol: decimal("amount_sol", { precision: 10, scale: 2 }).notNull(),
  transaction_signature: text("transaction_signature").notNull(),
  status: text("status").notNull(), // success, pending, failed
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);
export const selectSubscriptionPlanSchema = createSelectSchema(subscriptionPlans);

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  status: z.enum(["active", "expired", "cancelled"]).default("active"),
});
export const selectSubscriptionSchema = createSelectSchema(subscriptions);

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory, {
  status: z.enum(["success", "pending", "failed"]),
});
export const selectPaymentHistorySchema = createSelectSchema(paymentHistory);

// Types
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SelectSubscriptionPlan = z.infer<typeof selectSubscriptionPlanSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type SelectSubscription = z.infer<typeof selectSubscriptionSchema>;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type SelectPaymentHistory = z.infer<typeof selectPaymentHistorySchema>;

export const coinMappings = pgTable("coin_mappings", {
  id: serial("id").primaryKey(),
  kucoin_symbol: text("kucoin_symbol").unique().notNull(),
  coingecko_id: text("coingecko_id").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const coinImages = pgTable("coin_images", {
  id: serial("id").primaryKey(),
  coingecko_id: text("coingecko_id").unique().notNull(),
  image_url: text("image_url").notNull(),
  last_fetched: timestamp("last_fetched").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Create schemas for the new tables
export const insertCoinMappingSchema = createInsertSchema(coinMappings);
export const selectCoinMappingSchema = createSelectSchema(coinMappings);

export const insertCoinImageSchema = createInsertSchema(coinImages);
export const selectCoinImageSchema = createSelectSchema(coinImages);

// Export types for the new tables
export type InsertCoinMapping = z.infer<typeof insertCoinMappingSchema>;
export type SelectCoinMapping = z.infer<typeof selectCoinMappingSchema>;
export type InsertCoinImage = z.infer<typeof insertCoinImageSchema>;
export type SelectCoinImage = z.infer<typeof selectCoinImageSchema>;

// New tables for token tracking
export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  address: text("address").unique().notNull(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  image_url: text("image_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  initial_price_usd: decimal("initial_price_usd", { precision: 18, scale: 9 }).notNull(),
  initial_liquidity_usd: decimal("initial_liquidity_usd", { precision: 18, scale: 2 }).notNull(),
  bonding_curve_key: text("bonding_curve_key"),
  status_mad: boolean("status_mad").default(false),
  status_fad: boolean("status_fad").default(false),
  status_lb: boolean("status_lb").default(false),
  status_tri: boolean("status_tri").default(false),
});

export const token_trades = pgTable("token_trades", {
  id: serial("id").primaryKey(),
  token_id: integer("token_id").references(() => tokens.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  price_usd: decimal("price_usd", { precision: 18, scale: 9 }).notNull(),
  volume_usd: decimal("volume_usd", { precision: 18, scale: 2 }).notNull(),
  amount_sol: decimal("amount_sol", { precision: 18, scale: 9 }).notNull(),
  is_buy: boolean("is_buy").notNull(),
  wallet_address: text("wallet_address").notNull(),
  tx_signature: text("tx_signature").unique().notNull(),
}, (table) => ({
  // Add indexes for efficient querying
  token_timestamp_idx: index("token_trades_token_timestamp_idx").on(table.token_id, table.timestamp),
  token_wallet_idx: index("token_trades_token_wallet_idx").on(table.token_id, table.wallet_address),
  signature_idx: index("token_trades_signature_idx").on(table.tx_signature),
  timestamp_idx: index("token_trades_timestamp_idx").on(table.timestamp),
}));

export const token_statistics = pgTable("token_statistics", {
  id: serial("id").primaryKey(),
  token_id: integer("token_id").references(() => tokens.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  timeframe: text("timeframe").notNull(), // 1s, 5s, 15s, 30s, 1m, 5m, 15m, 30m, 1h
  open_price: decimal("open_price", { precision: 18, scale: 9 }).notNull(),
  close_price: decimal("close_price", { precision: 18, scale: 9 }).notNull(),
  high_price: decimal("high_price", { precision: 18, scale: 9 }).notNull(),
  low_price: decimal("low_price", { precision: 18, scale: 9 }).notNull(),
  volume: decimal("volume", { precision: 18, scale: 2 }).notNull(),
  trade_count: integer("trade_count").notNull(),
  buy_count: integer("buy_count").notNull(),
  sell_count: integer("sell_count").notNull(),
});

// Create schemas for new tables
export const insertTokenSchema = createInsertSchema(tokens);
export const selectTokenSchema = createSelectSchema(tokens);

export const insertTokenTradeSchema = createInsertSchema(token_trades);
export const selectTokenTradeSchema = createSelectSchema(token_trades);

export const insertTokenStatisticsSchema = createInsertSchema(token_statistics);
export const selectTokenStatisticsSchema = createSelectSchema(token_statistics);

// Export types for new tables
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type SelectToken = z.infer<typeof selectTokenSchema>;
export type InsertTokenTrade = z.infer<typeof insertTokenTradeSchema>;
export type SelectTokenTrade = z.infer<typeof selectTokenTradeSchema>;
export type InsertTokenStatistics = z.infer<typeof insertTokenStatisticsSchema>;
export type SelectTokenStatistics = z.infer<typeof selectTokenStatisticsSchema>;

// New Social Feature Tables
export const watchlists = pgTable("watchlists", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  is_public: boolean("is_public").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const watchlist_tokens = pgTable("watchlist_tokens", {
  id: serial("id").primaryKey(),
  watchlist_id: integer("watchlist_id").references(() => watchlists.id).notNull(),
  token_address: text("token_address").notNull(),
  notes: text("notes"),
  alert_price: decimal("alert_price", { precision: 18, scale: 9 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  watchlist_token_idx: index("watchlist_token_idx").on(table.watchlist_id, table.token_address),
}));

export const discussions = pgTable("discussions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  token_address: text("token_address").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  token_discussions_idx: index("token_discussions_idx").on(table.token_address),
  user_discussions_idx: index("user_discussions_idx").on(table.user_id),
}));

export const discussion_comments = pgTable("discussion_comments", {
  id: serial("id").primaryKey(),
  discussion_id: integer("discussion_id").references(() => discussions.id).notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const trader_profiles = pgTable("trader_profiles", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  biography: text("biography"),
  expertise_level: text("expertise_level").notNull(),
  trading_style: text("trading_style").array(),
  social_links: jsonb("social_links"),
  followers_count: integer("followers_count").default(0).notNull(),
  reputation_score: integer("reputation_score").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const trading_signals = pgTable("trading_signals", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  token_address: text("token_address").notNull(),
  signal_type: text("signal_type").notNull(), // buy, sell, hold
  entry_price: decimal("entry_price", { precision: 18, scale: 9 }),
  target_price: decimal("target_price", { precision: 18, scale: 9 }),
  stop_loss: decimal("stop_loss", { precision: 18, scale: 9 }),
  timeframe: text("timeframe").notNull(),
  analysis: text("analysis"),
  success_rate: decimal("success_rate", { precision: 5, scale: 2 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at"),
}, (table) => ({
  user_signals_idx: index("user_signals_idx").on(table.user_id),
  token_signals_idx: index("token_signals_idx").on(table.token_address),
}));

// Create schemas for new tables
export const insertWatchlistSchema = createInsertSchema(watchlists);
export const selectWatchlistSchema = createSelectSchema(watchlists);

export const insertWatchlistTokenSchema = createInsertSchema(watchlist_tokens);
export const selectWatchlistTokenSchema = createSelectSchema(watchlist_tokens);

export const insertDiscussionSchema = createInsertSchema(discussions);
export const selectDiscussionSchema = createSelectSchema(discussions);

export const insertDiscussionCommentSchema = createInsertSchema(discussion_comments);
export const selectDiscussionCommentSchema = createSelectSchema(discussion_comments);

export const insertTraderProfileSchema = createInsertSchema(trader_profiles);
export const selectTraderProfileSchema = createSelectSchema(trader_profiles);

export const insertTradingSignalSchema = createInsertSchema(trading_signals);
export const selectTradingSignalSchema = createSelectSchema(trading_signals);

// Export types for new tables
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type SelectWatchlist = z.infer<typeof selectWatchlistSchema>;
export type InsertWatchlistToken = z.infer<typeof insertWatchlistTokenSchema>;
export type SelectWatchlistToken = z.infer<typeof selectWatchlistTokenSchema>;
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type SelectDiscussion = z.infer<typeof selectDiscussionSchema>;
export type InsertDiscussionComment = z.infer<typeof insertDiscussionCommentSchema>;
export type SelectDiscussionComment = z.infer<typeof selectDiscussionCommentSchema>;
export type InsertTraderProfile = z.infer<typeof insertTraderProfileSchema>;
export type SelectTraderProfile = z.infer<typeof selectTraderProfileSchema>;
export type InsertTradingSignal = z.infer<typeof insertTradingSignalSchema>;
export type SelectTradingSignal = z.infer<typeof selectTradingSignalSchema>;