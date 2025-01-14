import { FC, useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import MarketDataBar from "@/components/MarketDataBar";
import SpaceBackground from "@/components/SpaceBackground";
import CryptoPrice from "@/components/CryptoPrice";
import AiChat from "@/components/AiChat";
import KiaraVideoWrapper from "@/components/KiaraVideoWrapper";
import TradingChart from "@/components/TradingChart";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import ThemeSwitcher from "@/components/ThemeSwitcher";

// Keep only the main tokens
const allTokens = [
  "bitcoin", "ethereum", "solana"
];

const Home: FC = () => {
  const [displayTokens, setDisplayTokens] = useState(allTokens);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <SpaceBackground />
      <div className="relative z-10">
        <MarketDataBar />
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {displayTokens.map((token, index) => (
              <CryptoPrice 
                key={`${token}-${index}`}
                coin={token}
                className="transform transition-all duration-1000 ease-in-out"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="h-[600px]">
              <KiaraVideoWrapper />
            </div>
            <div className="h-[600px] chat-window-container">
              <div className="retro-chat-overlay absolute inset-0 pointer-events-none"></div>
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