import { FC } from 'react';
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, Users } from 'lucide-react';
import { 
  Sheet,
  SheetTrigger,
  SheetContent
} from "@/components/ui/sheet";
import { SocialMetrics } from './SocialMetrics';
import { Watchlist } from './social/Watchlist';
import { TokenDiscussions } from './social/TokenDiscussions';
import { useTokenSocialMetricsStore } from '@/lib/social-metrics';
import { useSocialFeatures } from '@/hooks/use-social-features';
import type { Token } from '@/types/token';

interface SocialBarProps {
  selectedToken?: Token;
}

export const SocialBar: FC<SocialBarProps> = ({ selectedToken }) => {
  const { watchlist, discussions } = useSocialFeatures(selectedToken?.address || '');
  const metrics = useTokenSocialMetricsStore(state => 
    selectedToken ? state.getMetrics(selectedToken.address) : null
  );

  return (
    <div className="flex items-center justify-between p-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-900/10 via-purple-800/5 to-purple-900/10">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-purple-200">Watchlist</span>
              {watchlist?.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300">
                  {watchlist.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[400px] bg-[#111111] border-l border-purple-500/20 p-0">
            <div className="h-full overflow-auto">
              <Watchlist tokens={watchlist} />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-purple-200">Discussions</span>
              {discussions?.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300">
                  {discussions.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[400px] bg-[#111111] border-l border-purple-500/20 p-0">
            <div className="h-full overflow-auto">
              <TokenDiscussions
                tokenAddress={selectedToken?.address || ''}
                discussions={discussions || []}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-purple-200">Traders</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[400px] bg-[#111111] border-l border-purple-500/20 p-0">
            <div className="p-6">
              <h2 className="text-xl font-bold text-purple-100 mb-4">Top Traders</h2>
              <p className="text-gray-400">Trader profiles feature coming soon!</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {selectedToken && metrics && (
        <div className="flex-1 max-w-[500px]">
          <SocialMetrics
            tokenAddress={selectedToken.address}
            metrics={metrics}
          />
        </div>
      )}
    </div>
  );
};

export default SocialBar;
