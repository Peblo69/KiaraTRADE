import { eq, and } from "drizzle-orm";
import { db } from "@db";
import { subscriptionPlans, subscriptions, paymentHistory, users } from "@db/schema";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import type { InsertSubscription, InsertPaymentHistory } from "@db/schema";

export class SubscriptionService {
  private connection: Connection;

  constructor(endpoint: string = "https://api.devnet.solana.com") {
    this.connection = new Connection(endpoint);
  }

  async getUserSubscription(userId: number) {
    const now = new Date();
    return await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.user_id, userId),
        eq(subscriptions.status, "active")
      ),
      with: {
        plan: true
      }
    });
  }

  async createSubscription({
    userId,
    planId,
    transactionSignature,
    amountSol
  }: {
    userId: number;
    planId: number;
    transactionSignature: string;
    amountSol: number;
  }) {
    // Start a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Create subscription
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [subscription] = await tx
        .insert(subscriptions)
        .values({
          user_id: userId,
          plan_id: planId,
          status: "active",
          start_date: now,
          end_date: thirtyDaysFromNow,
        })
        .returning();

      // Record payment
      await tx.insert(paymentHistory).values({
        user_id: userId,
        subscription_id: subscription.id,
        amount_sol: amountSol,
        transaction_signature: transactionSignature,
        status: "success",
      });

      // Update user's subscription tier
      const plan = await tx.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, planId)
      });

      if (plan) {
        await tx
          .update(users)
          .set({ subscription_tier: plan.name.toLowerCase() })
          .where(eq(users.id, userId));
      }

      return subscription;
    });
  }

  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const transaction = await this.connection.getParsedTransaction(signature);

      if (!transaction || transaction.meta?.err) {
        return false;
      }

      // Verify the transaction is confirmed
      const confirmation = await this.connection.confirmTransaction(signature);
      return !confirmation.value.err;

    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }

  async cancelSubscription(subscriptionId: number, userId: number) {
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.user_id, userId),
        eq(subscriptions.status, "active")
      )
    });

    if (!subscription) {
      throw new Error("Subscription not found or already cancelled");
    }

    await db.transaction(async (tx) => {
      // Cancel subscription
      await tx
        .update(subscriptions)
        .set({ status: "cancelled" })
        .where(eq(subscriptions.id, subscriptionId));

      // Reset user's subscription tier to basic
      await tx
        .update(users)
        .set({ subscription_tier: "basic" })
        .where(eq(users.id, userId));
    });
  }

  async getSubscriptionPlans() {
    return await db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.is_active, true)
    });
  }
}

export const subscriptionService = new SubscriptionService();