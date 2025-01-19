import { FC, PropsWithChildren } from 'react';
import { Toaster } from "@/components/ui/toaster";
import MarketDataBar from "@/components/MarketDataBar";
import Navbar from "@/components/Navbar";

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      {/* Market Data Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <MarketDataBar />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="fixed top-12 left-0 right-0 z-40">
          <Navbar />
        </div>
        <main className="pt-32 px-4 lg:px-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
};