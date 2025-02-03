import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { ArrowUpIcon, ArrowDownIcon, Info } from "lucide-react";
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
import { MarketContext } from "@/components/MarketContext";
import { motion } from "framer-motion";
import CryptoIcon from "@/components/CryptoIcon";

interface MarketContextData {
  correlations: Array<{
    token: string;
    correlation: number;
  }>;
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

export default function PredictionsPage() {
  const { toast } = useToast();
  const [selectedTokens] = useState(['BTC-USDT', 'ETH-USDT', 'SOL-USDT']);

  const { data: predictions, isLoading } = useQuery<Record<string, PredictionResult>>({
    queryKey: ['/api/predictions'],
    refetchInterval: 30000,
  });

  const marketContextQueries = useQueries({
    queries: selectedTokens.map(token => ({
      queryKey: [`/api/market-context/${token}`],
      refetchInterval: 30000,
    }))
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

  function formatPredictionTime(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function calculatePriceChange(current: number, predicted: number) {
    return ((predicted - current) / current) * 100;
  }

  return (
    <div className="container mx-auto p-6 min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Advanced Price Predictions</h1>
          <p className="text-gray-400">
            ML-enhanced technical analysis updated every 30 seconds.
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
                    <h3 className="text-lg font-semibold mb-2">Risk Analysis</h3>
                    <ul className="list-disc pl-5 space-y-2">
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
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {selectedTokens.map((token, index) => {
          const prediction = predictions?.[token];
          const marketContext = marketContextQueries[index].data as MarketContextData;

          if (!prediction) {
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                key={token}
              >
                <Card className="p-6 bg-gray-800/50 border-gray-700">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-700 rounded"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          }

          const expectedPrice = prediction.sentiment === 'bullish'
            ? prediction.predictedPriceRange.high
            : prediction.predictedPriceRange.low;
          const priceChange = calculatePriceChange(prediction.currentPrice, expectedPrice);

          return (
            <motion.div
              key={token}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="space-y-6"
            >
              <Card className="p-6 bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CryptoIcon
                        symbol={token}
                        size="lg"
                        className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-1 border border-purple-500/30"
                      />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{token}</h3>
                      <p className="text-sm text-gray-400">Current: {formatPrice(prediction.currentPrice)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <span className="text-sm text-gray-400">24h Prediction:</span>
                      <span className={`text-sm font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPrice(expectedPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <motion.span
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          prediction.sentiment === 'bullish'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                      </motion.span>
                      <span className="text-xs text-gray-500">
                        {(prediction.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Updated: {formatPredictionTime(prediction.timestamp)}
                    </div>
                  </div>
                </div>

                {marketContext && (
                  <MarketContext
                    symbol={token}
                    correlations={marketContext.correlations}
                    volumeAnalysis={marketContext.volumeAnalysis}
                    marketDepth={marketContext.marketDepth}
                  />
                )}

                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Signal Strength</span>
                    <span className="text-sm text-gray-300">{(prediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <Progress
                    value={prediction.confidence * 100}
                    className="bg-gray-700 h-2"
                  />
                </div>

                <div className="text-sm text-gray-400 mt-4 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                  {prediction.sentiment === 'bullish' ? (
                    <div className="flex items-start gap-2">
                      <ArrowUpIcon className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                      <p>
                        Strong bullish momentum with volume profile confirming uptrend.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <ArrowDownIcon className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                      <p>
                        Bearish signals with volume profile suggesting continued downward pressure.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}