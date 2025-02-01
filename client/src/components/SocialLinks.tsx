
import React from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import { TelegramIcon } from './icons/TelegramIcon';
import { XIcon } from './icons/XIcon';
import { PumpFunIcon } from './icons/PumpFunIcon';
import { cn } from "@/lib/utils";
import { validateSocialUrl } from '@/utils/validators';

interface SocialLinksProps {
  website?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  address?: string | null;
  className?: string;
}

export const SocialLinks: React.FC<SocialLinksProps> = ({
  website,
  telegram,
  twitter,
  address,
  className
}) => {
  const handleClick = (url: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const validWebsite = website && validateSocialUrl(website);
  const validTelegram = telegram && validateSocialUrl(telegram);
  const validTwitter = twitter && validateSocialUrl(twitter);
  const pumpfunUrl = address ? `https://pump.fun/coin/${address}` : null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {validWebsite && (
        <a
          href={validWebsite}
          onClick={handleClick(validWebsite)}
          className="text-blue-400/70 hover:text-blue-300 transition-colors"
          title="Website"
        >
          <Globe className="w-4 h-4" />
        </a>
      )}

      {validTwitter && (
        <a
          href={validTwitter}
          onClick={handleClick(validTwitter)}
          className="text-blue-400/70 hover:text-blue-300 transition-colors"
          title="Twitter"
        >
          <XIcon className="w-4 h-4" />
        </a>
      )}

      {validTelegram && (
        <a
          href={validTelegram}
          onClick={handleClick(validTelegram)}
          className="text-blue-400/70 hover:text-blue-300 transition-colors"
          title="Telegram"
        >
          <TelegramIcon className="w-4 h-4" />
        </a>
      )}

      {pumpfunUrl && (
        <a
          href={pumpfunUrl}
          onClick={handleClick(pumpfunUrl)}
          className="text-blue-400/70 hover:text-blue-300 transition-colors"
          title="PumpFun"
        >
          <PumpFunIcon className="w-4 h-4" />
        </a>
      )}
    </div>
  );
};
