import { pgTable, text, serial, timestamp, boolean, integer, decimal, index } from "drizzle-orm/pg-core";
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