import { FC, PropsWithChildren } from 'react';
import { Toaster } from "@/components/ui/toaster";
import MarketDataBar from "@/components/MarketDataBar";
import Navbar from "@/components/Navbar";

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Market Data Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <MarketDataBar />
      </div>

      {/* Fixed Navigation Bar */}
      <div className="fixed top-12 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm">
        <Navbar />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <main className="pt-32 px-4 lg:px-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
};