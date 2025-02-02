import { FC } from "react";

interface PricePoint {
  timestamp: number;
  price: number;
}

interface PriceChartProps {
  data: PricePoint[];
  symbol: string;
}

export const PriceChart: FC<PriceChartProps> = ({ data, symbol }) => {
  return (
    <div className="w-full h-[120px] mt-4 bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-center h-full text-gray-400">
        Implementing clean price chart...
      </div>
    </div>
  );
};

export default PriceChart;