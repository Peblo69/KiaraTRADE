import { FC, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Star, AlertTriangle } from 'lucide-react';
import type { Token } from '@/types/token';
import { useToast } from "@/hooks/use-toast";

interface WatchlistProps {
  tokens?: Token[];
  onAddToken?: (token: Token) => void;
  onRemoveToken?: (token: Token) => void;
  onSetAlert?: (token: Token, price: number) => void;
}

export const Watchlist: FC<WatchlistProps> = ({
  tokens = [],
  onAddToken,
  onRemoveToken,
  onSetAlert
}) => {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddToken = (token: Token) => {
    onAddToken?.(token);
    toast({
      title: "Token Added",
      description: `${token.symbol} has been added to your watchlist`,
    });
  };

  const handleRemoveToken = (token: Token) => {
    onRemoveToken?.(token);
    toast({
      title: "Token Removed",
      description: `${token.symbol} has been removed from your watchlist`,
    });
  };

  const handleSetAlert = (token: Token, price: number) => {
    onSetAlert?.(token, price);
    toast({
      title: "Alert Set",
      description: `You will be notified when ${token.symbol} reaches $${price}`,
    });
  };

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/20">
      <div className="p-4 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-purple-50">Watchlist</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-400 hover:text-purple-300"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Token
          </Button>
        </div>
      </div>
      
      <div className="divide-y divide-purple-500/10">
        {tokens.map((token) => (
          <div
            key={token.address}
            className="p-3 flex items-center justify-between hover:bg-purple-500/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-purple-100">{token.symbol}</span>
              <span className="text-sm text-purple-300">${token.priceUsd?.toFixed(6)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-400 hover:text-purple-300"
                onClick={() => handleSetAlert(token, token.priceUsd || 0)}
              >
                <AlertTriangle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300"
                onClick={() => handleRemoveToken(token)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        
        {tokens.length === 0 && (
          <div className="p-8 text-center text-purple-400">
            No tokens in watchlist
          </div>
        )}
      </div>
    </Card>
  );
};

export default Watchlist;
