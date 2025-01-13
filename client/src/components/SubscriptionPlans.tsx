import { useEffect, useState } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Connection } from "@solana/web3.js";

interface Plan {
  id: number;
  name: string;
  price_sol: number;
  description: string;
  features: string[];
}

export default function SubscriptionPlans() {
  const { wallet, publicKey, sendTransaction } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingPlan, setProcessingPlan] = useState<number | null>(null);
  const [connection] = useState(() => new Connection("https://api.devnet.solana.com"));

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const subscribeToPlan = async (plan: Plan) => {
    if (!wallet || !publicKey) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to subscribe",
        variant: "destructive",
      });
      return;
    }

    setProcessingPlan(plan.id);

    try {
      // Create a Solana transaction
      const transaction = await fetch("/api/subscription/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          walletAddress: publicKey.toString()
        })
      }).then(res => res.json());

      // Sign and send transaction
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature);

      // Verify subscription on backend
      await fetch("/api/subscription/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature,
          planId: plan.id,
          amount: plan.price_sol
        })
      });

      toast({
        title: "Subscription Activated",
        description: `You are now subscribed to the ${plan.name} plan!`
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });

    } catch (error: any) {
      console.error("Subscription error:", error);
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to process subscription",
        variant: "destructive",
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-6 bg-purple-500/20 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-purple-500/20 rounded mb-4"></div>
            <div className="space-y-2 mb-6">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-4 bg-purple-500/20 rounded w-3/4"></div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      {plans?.map((plan) => (
        <Card
          key={plan.id}
          className="p-6 backdrop-blur-sm bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40 transition-all hover:transform hover:-translate-y-1"
        >
          <h3 className="text-xl font-bold text-purple-300 mb-2">{plan.name}</h3>
          <div className="text-3xl font-bold mb-4">{plan.price_sol} SOL</div>
          <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
          <ul className="space-y-2 mb-6">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Button 
            className="w-full bg-purple-500 hover:bg-purple-600"
            onClick={() => subscribeToPlan(plan)}
            disabled={!publicKey || processingPlan === plan.id}
          >
            {processingPlan === plan.id ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : !publicKey ? (
              'Connect Wallet to Subscribe'
            ) : (
              'Subscribe Now'
            )}
          </Button>
        </Card>
      ))}
    </div>
  );
}