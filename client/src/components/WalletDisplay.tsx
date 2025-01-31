import { FC } from 'react';
import { useWallet } from '@/lib/wallet';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import CryptoIcon from './CryptoIcon';

export const WalletDisplay: FC = () => {
  const { publicKey, balance, balanceUsd, tokens, isConnecting } = useWallet();
  const [, setLocation] = useLocation();

  if (!publicKey) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Card className="p-4 hover:bg-accent cursor-pointer transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Wallet Balance</h3>
              <span className="text-sm text-muted-foreground">
                {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CryptoIcon symbol="SOL" size="sm" />
              <div>
                <span className="font-mono">{balance.toFixed(4)} SOL</span>
                {balanceUsd !== null && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (${balanceUsd.toFixed(2)})
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {tokens.length} tokens
            </div>
          </div>
        </Card>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Your Wallet</SheetTitle>
          <SheetDescription>
            Connected to Phantom • {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <CryptoIcon symbol="SOL" size="md" />
                <div>
                  <div className="font-semibold">Solana</div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-lg">{balance.toFixed(4)} SOL</span>
                    {balanceUsd !== null && (
                      <span className="text-sm text-muted-foreground">
                        ${balanceUsd.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {isConnecting ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-2">
                  {tokens.map((token) => (
                    <Card 
                      key={token.mint} 
                      className="p-4 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        setLocation(`/project/${token.mint}`);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <CryptoIcon 
                          symbol={token.mint} 
                          size="sm" 
                        />
                        <div>
                          <div className="font-mono text-sm text-muted-foreground">
                            {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                          </div>
                          <div className="font-mono">
                            {token.balance.toFixed(token.decimals)} {token.symbol || 'tokens'}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WalletDisplay;