import { pgTable, text, serial, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  wallet_address: text("wallet_address"),
  subscription_tier: text("subscription_tier").default("basic").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

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

// Schemas
export const insertUserSchema = createInsertSchema(users, {
  subscription_tier: z.enum(["basic", "pro", "enterprise"]).default("basic"),
});

export const selectUserSchema = createSelectSchema(users);

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
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SelectSubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type SelectSubscription = typeof subscriptions.$inferSelect;
export type InsertPaymentHistory = typeof paymentHistory.$inferInsert;
export type SelectPaymentHistory = typeof paymentHistory.$inferSelect;