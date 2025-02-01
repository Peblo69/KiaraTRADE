import React from 'react';
import { Users, MessageCircle, Star, Activity } from 'lucide-react';

const SocialMetrics: React.FC = () => {
  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h2 className="text-purple-100 font-semibold">Social Metrics</h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Community Score</span>
            </div>
            <span className="text-sm font-medium text-purple-100">0/10</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Social Volume</span>
            </div>
            <span className="text-sm font-medium text-purple-400">0%</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Sentiment</span>
            </div>
            <span className="text-sm font-medium text-purple-400">N/A</span>
          </div>
        </div>

        <div className="border-t border-purple-900/30 pt-4">
          <div className="space-y-2">
            <div className="text-sm text-purple-300">Trending Topics</div>
            <div className="space-y-1">
              <div className="text-xs bg-purple-900/20 text-purple-100 px-2 py-1 rounded">
                No trending topics
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMetrics;