import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
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

import { integer, decimal } from "drizzle-orm/pg-core";