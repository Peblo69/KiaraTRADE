import PredictionCard from "@/components/PredictionCard";
import CryptoPrice from "@/components/CryptoPrice";
import { Card } from "@/components/ui/card";

export default function PredictionsPage() {
  const tokens = ['bitcoin', 'ethereum', 'solana'];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Token Price Predictions</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokens.map(token => (
          <div key={token} className="space-y-4">
            <CryptoPrice coin={token} />
            <PredictionCard symbol={token} />
          </div>
        ))}
      </div>
    </div>
  );
}
