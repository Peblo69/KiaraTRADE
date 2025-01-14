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

// Include the main tokens in the rotation
const allTokens = [
  "bitcoin", "ethereum", "solana", "cardano", "polkadot", 
  "avalanche-2", "chainlink", "polygon", "uniswap", 
  "cosmos", "near", "algorand", "ripple", "dogecoin"
];

const Home: FC = () => {
  const [displayTokens, setDisplayTokens] = useState([
    allTokens[0], // BTC
    allTokens[1], // ETH
    allTokens[2]  // SOL
  ]);

  useEffect(() => {
    let currentIndex = 2; // Start from SOL's position

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % allTokens.length;

      setDisplayTokens(prev => {
        return [
          prev[1], // ETH moves to BTC's position
          prev[2], // SOL moves to ETH's position
          allTokens[currentIndex] // New token appears
        ];
      });
    }, 10000); // Rotate every 10 seconds

    return () => clearInterval(interval);
  }, []); 

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
                className={`transform transition-all duration-1000 ease-in-out animate-slide-right`}
              />
            ))}
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