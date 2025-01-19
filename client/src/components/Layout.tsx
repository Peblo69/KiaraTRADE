import { FC, PropsWithChildren } from 'react';
import { Toaster } from "@/components/ui/toaster";
import MarketDataBar from "@/components/MarketDataBar";
import Navbar from "@/components/Navbar";

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Elements */}
      <div>
        <MarketDataBar />
        <Navbar />
      </div>

      {/* Main Content */}
      <main>
        {children}
      </main>
      <Toaster />
    </div>
  );
};