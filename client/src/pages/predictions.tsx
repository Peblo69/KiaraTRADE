import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { ArrowUpIcon, ArrowDownIcon, LineChart, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PredictionResult } from "../../../server/types/prediction";
import { AdvancedPriceChart } from "@/components/AdvancedPriceChart";
import { TechnicalAnalysis } from "@/components/TechnicalAnalysis";

interface ChartData {
  [key: string]: {
    klines: {
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[];
  };
}

export default function PredictionsPage() {
  const { toast } = useToast();
  const [selectedTokens] = useState(['BTC-USDT', 'ETH-USDT', 'SOL-USDT']);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');

  // Fetch predictions and chart data
  const { data: predictions, isLoading } = useQuery<Record<string, PredictionResult>>({
    queryKey: ['/api/predictions'],
    refetchInterval: 30000, // Increased frequency to 30 seconds
  });

  // Fetch OHLCV data for charts
  const { data: chartData } = useQuery<ChartData>({
    queryKey: ['/api/klines', selectedTimeframe],
    refetchInterval: 30000, // Increased frequency to 30 seconds
  });

  function getConfidenceColor(confidence: number) {
    if (confidence >= 0.7) return "bg-green-500";
    if (confidence >= 0.4) return "bg-yellow-500";
    return "bg-red-500";
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  }

  return (
    <div className="container mx-auto p-6 min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Advanced Price Predictions</h1>
          <p className="text-gray-400">
            ML-enhanced technical analysis updated every 30 seconds. Combines RSI, MACD, EMA, Bollinger Bands,
            Volume Profile, and Fibonacci levels for high-accuracy predictions.
          </p>
        </div>

        <Dialog>
          <DialogTrigger>
            <div className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
              <Info className="w-6 h-6 text-blue-400" />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Advanced Trading Analysis Features</DialogTitle>
              <DialogDescription>
                <div className="space-y-4 mt-4">
                  <section>
                    <h3 className="text-lg font-semibold mb-2">Technical Indicators</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>RSI (Relative Strength Index) - Momentum indicator</li>
                      <li>MACD (Moving Average Convergence Divergence) - Trend indicator</li>
                      <li>Bollinger Bands - Volatility and price levels</li>
                      <li>Fibonacci Retracement - Key support/resistance levels</li>
                      <li>Volume Profile - Trading activity analysis</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">Pattern Recognition</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Head & Shoulders pattern detection</li>
                      <li>Double Top/Bottom patterns</li>
                      <li>Volume breakout analysis</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">Risk Analysis</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>ATR (Average True Range) - Volatility measurement</li>
                      <li>Support & Resistance levels</li>
                      <li>Price prediction ranges with confidence levels</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">Updates & Accuracy</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Real-time data updates every 30 seconds</li>
                      <li>ML-enhanced pattern recognition</li>
                      <li>Multi-timeframe analysis capabilities</li>
                    </ul>
                  </section>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {selectedTokens.map(token => {
          const prediction = predictions?.[token];
          const tokenChartData = chartData?.[token]?.klines || [];

          if (!prediction || !tokenChartData.length) {
            return (
              <Card key={token} className="p-6 bg-gray-800/50 border-gray-700">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-700 rounded"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                  </div>
                </div>
              </Card>
            );
          }

          return (
            <div key={token} className="space-y-6">
              <Card className="p-6 bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/30">
                      <LineChart className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{token}</h3>
                      <p className="text-sm text-gray-400">Advanced Analysis</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    prediction.sentiment === 'bullish' 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {prediction.sentiment === 'bullish' ? 'Bullish' : 'Bearish'}
                  </span>
                </div>

                <div className="mt-6">
                  <AdvancedPriceChart
                    symbol={token}
                    data={tokenChartData}
                    indicators={prediction.indicators}
                  />
                </div>

                <TechnicalAnalysis
                  symbol={token}
                  patterns={prediction.indicators.patterns || []}
                  supportLevels={[prediction.predictedPriceRange.low]}
                  resistanceLevels={[prediction.predictedPriceRange.high]}
                  currentPrice={prediction.currentPrice}
                  rsi={prediction.indicators.rsi}
                  macd={prediction.indicators.macd}
                  volume={tokenChartData[tokenChartData.length - 1]?.volume || 0}
                />

                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Signal Strength</span>
                    <span className="text-sm text-gray-300">{(prediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={prediction.confidence * 100} 
                    className="bg-gray-700 h-2"
                    indicatorClassName={getConfidenceColor(prediction.confidence)}
                  />
                </div>

                <div className="text-sm text-gray-400 mt-4 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                  {prediction.sentiment === 'bullish' ? (
                    <div className="flex items-start gap-2">
                      <ArrowUpIcon className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                      <p>
                        Strong bullish momentum with RSI at {prediction.indicators.rsi.toFixed(1)}.
                        MACD shows positive crossover ({prediction.indicators.macd.toFixed(4)})
                        and price is trading above EMA (${prediction.indicators.ema.toFixed(2)}).
                        Volume profile confirms uptrend.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <ArrowDownIcon className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                      <p>
                        Bearish signals with elevated RSI at {prediction.indicators.rsi.toFixed(1)}.
                        MACD shows negative divergence ({prediction.indicators.macd.toFixed(4)})
                        and price below EMA support at ${prediction.indicators.ema.toFixed(2)}.
                        Volume profile suggests continued downward pressure.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}