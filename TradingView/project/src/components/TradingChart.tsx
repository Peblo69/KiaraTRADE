import React from 'react';

interface Props {
  tokenAddress: string;
}

const TradingChart: React.FC<Props> = ({ tokenAddress }) => {
  return (
    <div className="bg-[#0D0B1F] rounded-lg p-4 border border-purple-900/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-purple-100 font-semibold">
            Chart Implementation in Progress
          </h2>
        </div>
      </div>
      <div className="h-[500px] w-full flex items-center justify-center text-purple-400">
        Clean price chart coming soon...
      </div>
    </div>
  );
};

export default TradingChart;