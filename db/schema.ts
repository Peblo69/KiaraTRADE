import { pgTable, text, serial, timestamp, boolean, integer, decimal, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users
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


// Token related tables
export const tokens = pgTable("tokens", {
  address: text("address").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  decimals: integer("decimals").notNull(),
  image_url: text("image_url"),
  price_usd: decimal("price_usd", { precision: 18, scale: 9 }),
  liquidity_usd: decimal("liquidity_usd", { precision: 18, scale: 2 }),
  market_cap_usd: decimal("market_cap_usd", { precision: 18, scale: 2 }),
  total_supply: decimal("total_supply", { precision: 18, scale: 9 }),
  volume_24h: decimal("volume_24h", { precision: 18, scale: 2 }),
  price_change_24h: decimal("price_change_24h", { precision: 18, scale: 9 }),
  bonding_curve_key: text("bonding_curve_key"),
  mint_authority: text("mint_authority"),
  freeze_authority: text("freeze_authority"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const token_trades = pgTable("token_trades", {
  id: serial("id").primaryKey(),
  token_address: text("token_address").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  price_usd: decimal("price_usd", { precision: 18, scale: 9 }).notNull(),
  amount_tokens: decimal("amount_tokens", { precision: 18, scale: 9 }).notNull(),
  amount_sol: decimal("amount_sol", { precision: 18, scale: 9 }).notNull(),
  wallet_address: text("wallet_address").notNull(),
  tx_signature: text("tx_signature").unique().notNull(),
  type: text("type").notNull(), // 'buy' or 'sell'
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  token_timestamp_idx: index("token_trades_token_timestamp_idx").on(table.token_address, table.timestamp),
  wallet_idx: index("token_trades_wallet_idx").on(table.wallet_address),
  signature_idx: index("token_trades_signature_idx").on(table.tx_signature),
}));

// Coin mapping and images for exchange data
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

// Create schemas for all tables
export const insertTokenSchema = createInsertSchema(tokens);
export const selectTokenSchema = createSelectSchema(tokens);

export const insertTokenTradeSchema = createInsertSchema(token_trades);
export const selectTokenTradeSchema = createSelectSchema(token_trades);

export const insertCoinMappingSchema = createInsertSchema(coinMappings);
export const selectCoinMappingSchema = createSelectSchema(coinMappings);

export const insertCoinImageSchema = createInsertSchema(coinImages);
export const selectCoinImageSchema = createSelectSchema(coinImages);

// Export types
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type SelectToken = z.infer<typeof selectTokenSchema>;
export type InsertTokenTrade = z.infer<typeof insertTokenTradeSchema>;
export type SelectTokenTrade = z.infer<typeof selectTokenTradeSchema>;
export type InsertCoinMapping = z.infer<typeof insertCoinMappingSchema>;
export type SelectCoinMapping = z.infer<typeof selectCoinMappingSchema>;
export type InsertCoinImage = z.infer<typeof insertCoinImageSchema>;
export type SelectCoinImage = z.infer<typeof selectCoinImageSchema>;