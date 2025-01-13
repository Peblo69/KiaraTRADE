import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Basic",
    price: "10",
    features: ["Basic AI Analysis", "Real-time Charts", "Market Updates"],
  },
  {
    name: "Pro",
    price: "25",
    features: ["Advanced AI Signals", "Portfolio Management", "Priority Support"],
  },
  {
    name: "Enterprise",
    price: "50",
    features: ["Custom AI Models", "API Access", "Dedicated Account Manager"],
  },
];

export default function SubscriptionPlans() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      {plans.map((plan) => (
        <Card
          key={plan.name}
          className="p-6 backdrop-blur-sm bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40 transition-all hover:transform hover:-translate-y-1"
        >
          <h3 className="text-xl font-bold text-purple-300 mb-2">{plan.name}</h3>
          <div className="text-3xl font-bold mb-4">{plan.price} SOL</div>
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
          <Button className="w-full bg-purple-500 hover:bg-purple-600">
            Subscribe Now
          </Button>
        </Card>
      ))}
    </div>
  );
}
