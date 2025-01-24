import '@/lib/unified-websocket';
import { FC, useState } from "react";
import { Card } from "@/components/ui/card";
import { useUnifiedTokenStore } from "@/lib/unified-token-store";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { getTokenImage } from "@/lib/token-metadata";
import { formatPrice, formatMarketCap } from "@/lib/utils";
import Modal from "@/components/ui/modal";
import TokenChart from "@/components/TokenChart";

const TokenRow: FC<{ token: any; onClick: () => void }> = ({ token, onClick }) => {
  return (
    <Card 
      className="hover:bg-purple-500/5 transition-all duration-300 cursor-pointer group border-purple-500/20"
      onClick={onClick}
    >
      <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 items-center">
        <div className="flex items-center gap-3">
          <img
            src={token.imageLink || 'https://via.placeholder.com/150'}
            alt={`${token.symbol} logo`}
            className="w-10 h-10 rounded-full object-cover bg-purple-500/20"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
            }}
          />
          <div>
            <div className="font-medium group-hover:text-purple-400 transition-colors">
              {token.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {token.symbol}
            </div>
          </div>
        </div>
        <div className="text-right font-medium">
          {formatPrice(token.price)}
        </div>
        <div className="text-right">
          {formatMarketCap(token.marketCap)}
        </div>
        <div className="text-right">
          {formatMarketCap(token.liquidity)}
        </div>
        <div className="text-right">
          {formatMarketCap(token.volume)}
        </div>
      </div>
    </Card>
  );
};

const PumpFunVision: FC = () => {
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [showChart, setShowChart] = useState(false);
  const tokens = usePumpPortalStore((state) => state.tokens);
  const isConnected = usePumpPortalStore((state) => state.isConnected);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">PumpFun Vision</h1>
            <p className="text-sm text-muted-foreground">
              Track newly created tokens and their performance
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 px-4 py-2 text-sm text-muted-foreground">
            <div>Token</div>
            <div className="text-right">Price</div>
            <div className="text-right">Market Cap</div>
            <div className="text-right">Liquidity</div>
            <div className="text-right">Volume</div>
          </div>

          {!isConnected ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : tokens.length > 0 ? (
            tokens.map((token) => (
              <TokenRow
                key={token.address}
                token={token}
                onClick={() => {
                  setSelectedToken(token);
                  setShowChart(true);
                }}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Waiting for new tokens...</p>
            </div>
          )}
          <Modal open={showChart} onClose={() => setShowChart(false)}>
            <div className="max-w-4xl w-full mx-auto p-4 space-y-4">
              {selectedToken && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedToken.imageLink || 'https://via.placeholder.com/150'}
                        alt={`${selectedToken.symbol} logo`}
                        className="w-12 h-12 rounded-full object-cover bg-purple-500/20"
                      />
                      <div>
                        <h2 className="text-2xl font-bold">{selectedToken.name}</h2>
                        <p className="text-muted-foreground">{selectedToken.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatPrice(selectedToken.price)}</div>
                      <div className="text-sm text-muted-foreground">Current Price</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="p-4">
                      <div className="text-sm text-muted-foreground">Market Cap</div>
                      <div className="text-lg font-bold">{formatMarketCap(selectedToken.marketCap)}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-sm text-muted-foreground">Liquidity</div>
                      <div className="text-lg font-bold">{formatMarketCap(selectedToken.liquidity)}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-sm text-muted-foreground">24h Volume</div>
                      <div className="text-lg font-bold">{formatMarketCap(selectedToken.volume)}</div>
                    </Card>
                  </div>

                  <TokenChart tokenAddress={selectedToken.address} />
                </>
              )}
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default PumpFunVision;