import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Users } from 'lucide-react';

const TraderProfiles: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-purple-100 mb-8">Top Traders</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/20">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-100">Feature Coming Soon</h3>
                <p className="text-sm text-gray-400">Top Trader Profiles</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">Success Rate Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Follow System</span>
            </div>
          </div>

          <Button 
            className="w-full mt-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30"
            disabled
          >
            Coming Soon
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default TraderProfiles;
