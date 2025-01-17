import { FC } from 'react';
import {
  BsTwitterX,
  BsTelegram,
  BsDiscord
} from 'react-icons/bs';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface SocialMetricsProps {
  tokenAddress: string;
  metrics: {
    twitterFollowers?: number;
    twitterMentions24h?: number;
    telegramMembers?: number;
    discordMembers?: number;
    sentiment?: number;
  };
}

const formatNumber = (num?: number): string => {
  if (num === undefined) return 'N/A';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const SocialMetrics: FC<SocialMetricsProps> = ({ metrics }) => {
  const sentimentColor = metrics.sentiment 
    ? metrics.sentiment > 0 
      ? `rgb(${Math.floor(255 * (1 - metrics.sentiment))}, 255, ${Math.floor(255 * (1 - metrics.sentiment))})` 
      : `rgb(255, ${Math.floor(255 * (1 + metrics.sentiment))}, ${Math.floor(255 * (1 + metrics.sentiment))})`
    : 'rgb(229, 231, 235)';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 border-t border-gray-800 pt-4"
    >
      <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
        <Sparkles size={14} className="text-blue-400" />
        Social Metrics
      </h4>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center p-2 bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <BsTwitterX className="text-blue-400" size={14} />
            <span className="text-xs text-gray-400">Twitter</span>
          </div>
          <span className="text-sm font-bold text-white">{formatNumber(metrics.twitterFollowers)}</span>
          <span className="text-xs text-gray-500">
            +{formatNumber(metrics.twitterMentions24h)} mentions
          </span>
        </div>

        <div className="flex flex-col items-center p-2 bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <BsTelegram className="text-blue-400" size={14} />
            <span className="text-xs text-gray-400">Telegram</span>
          </div>
          <span className="text-sm font-bold text-white">{formatNumber(metrics.telegramMembers)}</span>
          <span className="text-xs text-gray-500">members</span>
        </div>

        <div className="flex flex-col items-center p-2 bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <BsDiscord className="text-blue-400" size={14} />
            <span className="text-xs text-gray-400">Discord</span>
          </div>
          <span className="text-sm font-bold text-white">{formatNumber(metrics.discordMembers)}</span>
          <span className="text-xs text-gray-500">members</span>
        </div>
      </div>

      <div className="mt-2 p-2 bg-gray-900/50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Sentiment Score</span>
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: sentimentColor }}
          />
        </div>
        <div className="mt-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-500"
            style={{ 
              width: `${((metrics.sentiment || 0) + 1) * 50}%`,
              backgroundColor: sentimentColor
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default SocialMetrics;