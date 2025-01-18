import { FC, PropsWithChildren } from 'react';
import { Toaster } from "@/components/ui/toaster";

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className="flex-1">
        <main className="pt-4 px-4 lg:px-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
};