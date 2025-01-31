import React from 'react';
import { Link } from 'wouter';
import { MessageSquare, Star, Users } from 'lucide-react';
import { Card } from "@/components/ui/card";

const SocialHub: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-purple-100 mb-8">Community Hub</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/watchlists">
          <Card className="p-6 cursor-pointer hover:bg-purple-900/20 transition-colors border-purple-500/20">
            <div className="flex items-center gap-4">
              <Star className="w-8 h-8 text-yellow-400" />
              <div>
                <h2 className="text-xl font-semibold text-purple-100">Watchlists</h2>
                <p className="text-sm text-gray-400">Track and share your favorite tokens</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/discussions">
          <Card className="p-6 cursor-pointer hover:bg-purple-900/20 transition-colors border-purple-500/20">
            <div className="flex items-center gap-4">
              <MessageSquare className="w-8 h-8 text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-purple-100">Discussions</h2>
                <p className="text-sm text-gray-400">Join the community conversation</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/traders">
          <Card className="p-6 cursor-pointer hover:bg-purple-900/20 transition-colors border-purple-500/20">
            <div className="flex items-center gap-4">
              <Users className="w-8 h-8 text-green-400" />
              <div>
                <h2 className="text-xl font-semibold text-purple-100">Traders</h2>
                <p className="text-sm text-gray-400">Follow top traders and their signals</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default SocialHub;
