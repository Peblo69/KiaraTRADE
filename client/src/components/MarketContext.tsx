import { FC } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, BarChart2, Activity } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface Props {
  symbol: string;
  correlations: {
    token: string;
    correlation: number;
  }[];
  volumeAnalysis: {
    current: number;
    average: number;
    trend: 'up' | 'down';
    unusualActivity: boolean;
  };
  marketDepth: {
    buyPressure: number;
    sellPressure: number;
    strongestSupport: number;
    strongestResistance: number;
  };
}

export const MarketContext: FC<Props> = ({
  symbol,
  correlations,
  volumeAnalysis,
  marketDepth,
}) => {
  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="p-6 bg-gray-800/50">
          <h3 className="text-lg font-semibold text-white mb-4">Market Context</h3>
          
          {/* Correlations Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <LineChart className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-medium text-gray-200">Token Correlations</h4>
            </div>
            <div className="space-y-3">
              {correlations.map(({ token, correlation }) => (
                <div key={token} className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 min-w-[80px]">{token}</span>
                  <Progress 
                    value={Math.abs(correlation * 100)} 
                    className="bg-gray-700"
                    indicatorClassName={correlation > 0 ? 'bg-green-500' : 'bg-red-500'}
                  />
                  <span className="text-sm text-gray-300 min-w-[60px]">
                    {(correlation * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Volume Analysis */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              <h4 className="text-sm font-medium text-gray-200">Volume Analysis</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-gray-900/50">
                <div className="text-sm text-gray-400 mb-1">Current vs Average</div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-white">
                    {((volumeAnalysis.current / volumeAnalysis.average) * 100).toFixed(1)}%
                  </span>
                  <span className={`text-sm ${
                    volumeAnalysis.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {volumeAnalysis.trend === 'up' ? '↑' : '↓'}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-900/50">
                <div className="text-sm text-gray-400 mb-1">Activity</div>
                <div className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 ${
                    volumeAnalysis.unusualActivity ? 'text-yellow-400' : 'text-green-400'
                  }`} />
                  <span className="text-sm text-gray-200">
                    {volumeAnalysis.unusualActivity ? 'Unusual' : 'Normal'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Market Depth */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-green-400" />
              <h4 className="text-sm font-medium text-gray-200">Market Depth</h4>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded bg-gray-900/50">
                <span className="text-sm text-gray-400">Buy Pressure</span>
                <Progress 
                  value={marketDepth.buyPressure} 
                  className="w-32 bg-gray-700"
                  indicatorClassName="bg-green-500"
                />
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-gray-900/50">
                <span className="text-sm text-gray-400">Sell Pressure</span>
                <Progress 
                  value={marketDepth.sellPressure} 
                  className="w-32 bg-gray-700"
                  indicatorClassName="bg-red-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="text-center p-2 rounded bg-gray-900/50">
                  <div className="text-sm text-gray-400">Support</div>
                  <div className="text-sm text-green-400">
                    ${marketDepth.strongestSupport.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-2 rounded bg-gray-900/50">
                  <div className="text-sm text-gray-400">Resistance</div>
                  <div className="text-sm text-red-400">
                    ${marketDepth.strongestResistance.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
};
