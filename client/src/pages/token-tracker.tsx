import { FC, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import TokenList from "@/components/TokenList";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useHeliusStore } from "@/lib/helius-websocket";

const TokenTracker: FC = () => {
  const isPortalConnected = usePumpPortalStore(state => state.isConnected);
  const isHeliusConnected = useHeliusStore(state => state.isConnected);

  useEffect(() => {
    console.log('[TokenTracker] WebSocket Status:', {
      portal: isPortalConnected ? 'Connected' : 'Disconnected',
      helius: isHeliusConnected ? 'Connected' : 'Disconnected'
    });
  }, [isPortalConnected, isHeliusConnected]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold">Live Token Tracker</h1>
          <div className="flex gap-2 mt-2">
            <div className={`h-2 w-2 rounded-full ${isPortalConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">PumpPortal</span>
            <div className={`h-2 w-2 rounded-full ml-4 ${isHeliusConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">Helius</span>
          </div>
        </div>

        <TokenList />
      </main>
    </div>
  );
};

export default TokenTracker;
