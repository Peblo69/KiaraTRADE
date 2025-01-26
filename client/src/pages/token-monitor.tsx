import { FC, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useSolanaMonitor } from "@/lib/solana-monitor";
import { NewTokenAlert } from "@/components/NewTokenAlert";
import { Loader2 } from "lucide-react";
import { RugcheckButton } from "@/components/ui/rugcheck-button";

const TokenMonitor: FC = () => {
  const tokens = useSolanaMonitor((state) => state.tokens);
  const isConnected = useSolanaMonitor((state) => state.isConnected);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Solana Token Monitor</h1>
            <p className="text-sm text-muted-foreground">
              Live monitoring of new token launches on Solana
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>

        {!isConnected ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : tokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token) => (
              <Card 
                key={token.address}
                className="p-4 hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium group-hover:text-purple-400 transition-colors">
                      {token.symbol || 'Unknown Token'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {token.name || token.address.slice(0, 8)}
                    </div>
                  </div>
                  <RugcheckButton 
                    mint={token.address}
                    onRiskUpdate={(score) => {
                      console.log(`[TokenMonitor] Risk score for ${token.address}: ${score}`);
                    }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Created {token.createdAt.toLocaleTimeString()}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">Waiting for new tokens...</p>
          </div>
        )}
      </div>
      <NewTokenAlert />
    </div>
  );
};

export default TokenMonitor;
