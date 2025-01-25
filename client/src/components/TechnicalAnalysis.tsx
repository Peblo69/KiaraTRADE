import { FC } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Activity, TrendingUp, TrendingDown, AlertTriangle,
  BarChart2, ArrowUp, ArrowDown, Target
} from 'lucide-react';

interface Pattern {
  name: string;
  confidence: number;
  type: 'bullish' | 'bearish';
  description: string;
}

interface Props {
  symbol: string;
  patterns: Pattern[];
  supportLevels: number[];
  resistanceLevels: number[];
  currentPrice: number;
  rsi: number;
  macd: number;
  volume: number;
}

export const TechnicalAnalysis: FC<Props> = ({
  symbol,
  patterns = [],
  supportLevels = [],
  resistanceLevels = [],
  currentPrice,
  rsi,
  macd,
  volume
}) => {
  const nearestSupport = supportLevels.length > 0
    ? supportLevels
        .filter(level => level < currentPrice)
        .sort((a, b) => b - a)[0]
    : currentPrice * 0.95; // Default to 5% below current price

  const nearestResistance = resistanceLevels.length > 0
    ? resistanceLevels
        .filter(level => level > currentPrice)
        .sort((a, b) => a - b)[0]
    : currentPrice * 1.05; // Default to 5% above current price

  const formatPrice = (price: number | undefined): string => {
    if (typeof price !== 'number') return 'N/A';
    return price.toFixed(2);
  };

  const getPriceStrength = () => {
    if (rsi > 70) return { text: 'Overbought', color: 'text-red-400' };
    if (rsi < 30) return { text: 'Oversold', color: 'text-green-400' };
    return { text: 'Neutral', color: 'text-gray-400' };
  };

  const strength = getPriceStrength();

  return (
    <div className="space-y-6">
      {patterns.length > 0 && (
        <Card className="p-6 bg-gray-800/50">
          <h3 className="text-lg font-semibold text-white mb-4">Pattern Recognition</h3>
          <div className="space-y-4">
            {patterns.map((pattern, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50">
                {pattern.type === 'bullish' ? (
                  <TrendingUp className="w-5 h-5 text-green-400 mt-1" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400 mt-1" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{pattern.name}</span>
                    <span className={`text-sm ${pattern.type === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                      {(pattern.confidence * 100).toFixed(1)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{pattern.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 bg-gray-800/50">
        <h3 className="text-lg font-semibold text-white mb-4">Key Levels</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50">
            <div className="flex items-center gap-2">
              <ArrowUp className="w-5 h-5 text-red-400" />
              <span className="text-gray-300">Nearest Resistance</span>
            </div>
            <span className="font-mono text-red-400">${formatPrice(nearestResistance)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              <span className="text-gray-300">Current Price</span>
            </div>
            <span className="font-mono text-white">${formatPrice(currentPrice)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50">
            <div className="flex items-center gap-2">
              <ArrowDown className="w-5 h-5 text-green-400" />
              <span className="text-gray-300">Nearest Support</span>
            </div>
            <span className="font-mono text-green-400">${formatPrice(nearestSupport)}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gray-800/50">
        <h3 className="text-lg font-semibold text-white mb-4">Market Strength</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-gray-900/50">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300">RSI</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-white">{formatPrice(rsi)}</span>
              <span className={`text-sm ${strength.color}`}>{strength.text}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-gray-900/50">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300">MACD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-white">{macd.toFixed(4)}</span>
              <span className={`text-sm ${macd > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {macd > 0 ? 'Bullish' : 'Bearish'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {patterns.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <p className="text-sm text-yellow-200">
            No significant patterns detected at the moment. Keep monitoring for new formations.
          </p>
        </div>
      )}
    </div>
  );
};