import { FC, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface PredictionCardProps {
  symbol: string;
}

export const PredictionCard: FC<PredictionCardProps> = ({ symbol }) => {
  const { data: prediction, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/prediction/${symbol}`],
    enabled: false,
  });

  const handlePredict = () => {
    refetch();
  };

  if (error) return (
    <Card className="p-4">
      <div className="text-red-500">Failed to load prediction</div>
    </Card>
  );

  return (
    <Card className="p-4 backdrop-blur-sm bg-purple-900/10 border-purple-500/20">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-purple-300">Price Prediction: {symbol}</h3>
        <Button 
          onClick={handlePredict}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Predict"
          )}
        </Button>
      </div>

      {prediction && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Sentiment</span>
            <div className="flex items-center">
              {prediction.sentiment === 'bullish' ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={prediction.sentiment === 'bullish' ? 'text-green-500' : 'text-red-500'}>
                {prediction.sentiment.charAt(0).toUpperCase() + prediction.sentiment.slice(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Predicted Range</span>
            <span>
              ${prediction.predictedPriceRange.low.toFixed(6)} - ${prediction.predictedPriceRange.high.toFixed(6)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${prediction.confidence * 100}%` }}
                />
              </div>
              <span>{(prediction.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-400">RSI</div>
                <div>{prediction.indicators.rsi.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400">MACD</div>
                <div>{prediction.indicators.macd.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-gray-400">EMA</div>
                <div>{prediction.indicators.ema.toFixed(6)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PredictionCard;
