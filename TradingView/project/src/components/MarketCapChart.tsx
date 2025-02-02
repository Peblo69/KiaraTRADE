import React, { useEffect, useRef } from 'react';

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MarketCapChartProps {
  tokenAddress: string;
}

const MarketCapChart: React.FC<MarketCapChartProps> = ({ tokenAddress }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCandle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    candle: Candle,
    width: number,
    scaleY: number,
    baseline: number
  ) => {
    const isGreen = candle.close >= candle.open;
    ctx.strokeStyle = isGreen ? '#00ff00' : '#ff0000';
    ctx.fillStyle = isGreen ? '#00ff0020' : '#ff000020';

    // Draw candle body
    const openY = baseline - (candle.open * scaleY);
    const closeY = baseline - (candle.close * scaleY);
    const height = Math.abs(closeY - openY);

    ctx.fillRect(x, Math.min(openY, closeY), width, height);
    ctx.strokeRect(x, Math.min(openY, closeY), width, height);

    // Draw wicks
    ctx.beginPath();
    ctx.moveTo(x + width / 2, baseline - (candle.high * scaleY));
    ctx.lineTo(x + width / 2, Math.min(openY, closeY));
    ctx.moveTo(x + width / 2, Math.max(openY, closeY));
    ctx.lineTo(x + width / 2, baseline - (candle.low * scaleY));
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background
    ctx.fillStyle = '#0D0B1F';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
    }
    ctx.stroke();

    // Sample data - replace with real market cap data
    const sampleData: Candle[] = [
      { timestamp: Date.now() - 5000, open: 100, high: 120, low: 90, close: 110 },
      { timestamp: Date.now() - 4000, open: 110, high: 130, low: 100, close: 120 },
      { timestamp: Date.now() - 3000, open: 120, high: 140, low: 110, close: 115 },
      { timestamp: Date.now() - 2000, open: 115, high: 125, low: 105, close: 95 },
      { timestamp: Date.now() - 1000, open: 95, high: 115, low: 85, close: 105 }
    ];

    const scaleY = canvas.height / 200; // Adjust based on price range
    const candleWidth = 40;
    const spacing = 20;

    sampleData.forEach((candle, i) => {
      drawCandle(
        ctx,
        i * (candleWidth + spacing) + spacing,
        candle,
        candleWidth,
        scaleY,
        canvas.height
      );
    });
  }, [tokenAddress]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full h-[400px] rounded-lg"
      />
      <div className="absolute top-4 left-4 text-purple-100 font-medium">
        Market Cap Chart
      </div>
    </div>
  );
};

export default MarketCapChart;
