import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { ArrowUpIcon, ArrowDownIcon, BarChart3, Activity, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PredictionResult } from "../../server/types/prediction";

export default function PredictionsPage() {
  const { toast } = useToast();
  const [selectedTokens] = useState(['BTC-USDT', 'ETH-USDT', 'SOL-USDT']);

  const { data: predictions, isLoading } = useQuery<Record<string, PredictionResult>>({
    queryKey: ['/api/predictions'],
    refetchInterval: 60000, // Refresh every minute
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to fetch predictions",
        description: error.message
      });
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Price Predictions</h1>
        <p className="text-gray-400">Technical analysis based predictions updated every minute</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {selectedTokens.map(token => (
          <Card key={token} className="p-6 bg-gray-800/50 border-gray-700 backdrop-blur-sm">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-8 bg-gray-700 rounded"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            ) : predictions?.[token] ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{token}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    predictions[token].sentiment === 'bullish' 
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {predictions[token].sentiment === 'bullish' ? 'Bullish' : 'Bearish'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Current Price</span>
                    <span>{formatPrice(predictions[token].currentPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Predicted Range</span>
                    <span>
                      {formatPrice(predictions[token].predictedPriceRange.low)} - {formatPrice(predictions[token].predictedPriceRange.high)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-gray-300">RSI</span>
                      </div>
                      <span className="text-sm text-gray-300">{predictions[token].indicators.rsi.toFixed(2)}</span>
                    </div>
                    <Progress 
                      value={predictions[token].indicators.rsi} 
                      className="bg-gray-700"
                      indicatorClassName={getConfidenceColor(predictions[token].confidence)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-gray-300">MACD</span>
                      </div>
                      <span className="text-sm text-gray-300">{predictions[token].indicators.macd.toFixed(4)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-gray-300">EMA</span>
                      </div>
                      <span className="text-sm text-gray-300">{predictions[token].indicators.ema.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Prediction Confidence</span>
                    <span className="text-sm text-gray-300">{(predictions[token].confidence * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={predictions[token].confidence * 100} 
                    className="bg-gray-700"
                    indicatorClassName={getConfidenceColor(predictions[token].confidence)}
                  />
                </div>

                <div className="text-sm text-gray-400 mt-4">
                  {predictions[token].sentiment === 'bullish' ? (
                    <div className="flex items-start gap-2">
                      <ArrowUpIcon className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                      <p>
                        Bullish signals detected with RSI at {predictions[token].indicators.rsi.toFixed(1)}{' '}
                        and positive MACD crossover. Price above EMA indicates upward momentum.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <ArrowDownIcon className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                      <p>
                        Bearish signals with RSI at {predictions[token].indicators.rsi.toFixed(1)}{' '}
                        and negative MACD divergence. Price below EMA suggests downward pressure.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No prediction data available
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}