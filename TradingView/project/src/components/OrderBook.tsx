import React from 'react';
import { BookOpen } from 'lucide-react';
import type { OrderBook as OrderBookType } from '../types/trading';

// This component displays an order book using static (mock) data.
const OrderBook: React.FC = () => {
  const mockOrderBook: OrderBookType = {
    asks: [
      [46789.50, 0.2345],
      [46789.00, 1.5678],
      [46788.50, 0.8912],
      [46788.00, 2.3456],
      [46787.50, 1.7890],
      [46787.00, 0.9876],
      [46786.50, 1.2345],
      [46786.00, 0.6789]
    ],
    bids: [
      [46785.50, 1.8765],
      [46785.00, 0.5432],
      [46784.50, 1.9876],
      [46784.00, 0.7654],
      [46783.50, 2.1098],
      [46783.00, 1.5432],
      [46782.50, 0.8765],
      [46782.00, 1.3456]
    ]
  };

  // Helper function to format numbers
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      {/* Header */}
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h2 className="text-purple-100 font-semibold">Order Book</h2>
          </div>
          <div className="flex space-x-2 text-sm">
            <button className="px-2 py-1 rounded bg-purple-900/20 text-purple-300 hover:bg-purple-900/40 transition-colors">
              0.1
            </button>
            <button className="px-2 py-1 rounded bg-purple-900/20 text-purple-300 hover:bg-purple-900/40 transition-colors">
              0.01
            </button>
            <button className="px-2 py-1 rounded bg-purple-600 text-white">
              0.001
            </button>
          </div>
        </div>
      </div>

      {/* Order Book Data */}
      <div className="p-2">
        {/* Asks */}
        <div className="grid grid-cols-4 text-xs text-purple-400 pb-2">
          <span>Price</span>
          <span className="text-right">Size</span>
          <span className="text-right">Total</span>
          <span className="text-right">Sum</span>
        </div>

        <div className="space-y-0.5">
          {mockOrderBook.asks.map(([price, size], i) => {
            const total = price * size;
            const sum = mockOrderBook.asks
              .slice(0, i + 1)
              .reduce((acc, [p, s]) => acc + p * s, 0);

            return (
              <div key={i} className="grid grid-cols-4 text-xs group hover:bg-purple-900/20 cursor-pointer">
                <span className="text-red-400 font-medium">{formatNumber(price, 2)}</span>
                <span className="text-right text-purple-300">{formatNumber(size, 4)}</span>
                <span className="text-right text-purple-300">{formatNumber(total)}</span>
                <span className="text-right text-purple-300">{formatNumber(sum)}</span>
              </div>
            );
          })}
        </div>

        <div className="text-center py-2 border-y border-purple-900/30 my-2">
          <span className="text-xl font-bold text-green-400">
            {formatNumber(mockOrderBook.asks[0][0], 2)}
          </span>
          <span className="text-purple-400 text-sm ml-2">$46,789.00</span>
        </div>

        {/* Bids */}
        <div className="space-y-0.5">
          {mockOrderBook.bids.map(([price, size], i) => {
            const total = price * size;
            const sum = mockOrderBook.bids
              .slice(0, i + 1)
              .reduce((acc, [p, s]) => acc + p * s, 0);

            return (
              <div key={i} className="grid grid-cols-4 text-xs group hover:bg-purple-900/20 cursor-pointer">
                <span className="text-green-400 font-medium">{formatNumber(price, 2)}</span>
                <span className="text-right text-purple-300">{formatNumber(size, 4)}</span>
                <span className="text-right text-purple-300">{formatNumber(total)}</span>
                <span className="text-right text-purple-300">{formatNumber(sum)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
