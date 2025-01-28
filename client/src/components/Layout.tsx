import { FC, PropsWithChildren } from 'react';
import { Toaster } from "@/components/ui/toaster";
import SpaceBackground from './SpaceBackground';

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-[#0B0F13] text-white overflow-hidden">
      <SpaceBackground />
      <div className="relative z-10">
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
};