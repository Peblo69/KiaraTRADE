import { FC, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import CryptoPrice from "@/components/CryptoPrice";
import AiChat from "@/components/AiChat";
import KiaraVideoWrapper from "@/components/KiaraVideoWrapper";
import TradingChart from "@/components/TradingChart";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const popularTokens = [
  "solana", "cardano", "polkadot", "avalanche-2", "chainlink", 
  "polygon", "uniswap", "cosmos", "near", "algorand"
];

const Home: FC = () => {
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTokenIndex((prev) => (prev + 1) % popularTokens.length);
    }, 10000); // Rotate every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <CryptoPrice coin="bitcoin" />
            <CryptoPrice coin="ethereum" />
            <CryptoPrice 
              coin={popularTokens[currentTokenIndex]} 
              key={popularTokens[currentTokenIndex]} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="h-[600px]">
              <KiaraVideoWrapper />
            </div>
            <div className="h-[600px]">
              <AiChat />
            </div>
          </div>

          <div className="mb-8">
            <TradingChart />
          </div>

          <SubscriptionPlans />
        </main>
        <ThemeSwitcher className="fixed bottom-4 right-4" />
      </div>
    </div>
  );
};

export default Home;