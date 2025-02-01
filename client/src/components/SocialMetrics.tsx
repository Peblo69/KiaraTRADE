import React from 'react';
import { Card } from '@/components/ui/card';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';
import { TelegramIcon } from './icons/TelegramIcon';
import { XIcon } from './icons/XIcon';

interface Props {
  tokenAddress: string;
}

const SocialMetrics: React.FC<Props> = ({ tokenAddress }) => {
  const token = usePumpPortalStore(state => state.getToken(tokenAddress));

  if (!token) return null;

  return (
    <Card className="p-4 bg-[#0D0B1F] border-purple-900/30">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-purple-100">Social Links</h2>
        <div className="flex flex-col space-y-2">
          {token.socials?.twitter && (
            <a 
              href={token.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-purple-300 hover:text-purple-100"
            >
              <XIcon className="w-4 h-4" />
              <span>Twitter</span>
            </a>
          )}
          {token.socials?.telegram && (
            <a 
              href={token.socials.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-purple-300 hover:text-purple-100"
            >
              <TelegramIcon className="w-4 h-4" />
              <span>Telegram</span>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SocialMetrics;