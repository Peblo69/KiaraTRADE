import { FC, PropsWithChildren } from 'react';
import { Toaster } from "@/components/ui/toaster";

export const Layout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1">
        <main>
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
};