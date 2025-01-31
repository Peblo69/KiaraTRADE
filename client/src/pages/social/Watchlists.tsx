import React from 'react';
import { Watchlist } from '@/components/social/Watchlist';
import { useToast } from "@/hooks/use-toast";
import { useSocialFeatures } from "@/hooks/use-social-features";
import type { Token } from '@/types/token';

const Watchlists: React.FC = () => {
  const { toast } = useToast();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useSocialFeatures("default");

  const handleAddToken = (token: Token) => {
    addToWatchlist.mutate({
      token_address: token.address,
      notes: "",
    });
  };

  const handleRemoveToken = (token: Token) => {
    removeFromWatchlist.mutate(token.address);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-purple-100 mb-8">My Watchlists</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <Watchlist
          tokens={watchlist}
          onAddToken={handleAddToken}
          onRemoveToken={handleRemoveToken}
        />
      </div>
    </div>
  );
};

export default Watchlists;
