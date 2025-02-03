import React, { useState } from 'react';
import { DollarSign, Percent, Wallet, CreditCard } from 'lucide-react';
import type { OrderFormData } from '../types/trading';

const TradingForm: React.FC = () => {
  const [formData, setFormData] = useState<OrderFormData>({
    type: 'limit',
    side: 'buy',
    amount: 0,
    price: 46789.50,
  });

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num === 0) return '0';
    return Number(num).toFixed(decimals);
  };

  return (
    <div className="bg-[#0D0B1F] rounded-lg border border-purple-900/30">
      <div className="p-4 border-b border-purple-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            <h2 className="text-purple-100 font-semibold">Spot Trade</h2>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-purple-300">
              Available: <span className="font-medium">12.3456 BTC</span>
            </div>
            <button className="flex items-center space-x-1 px-2 py-1 text-xxs rounded bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-600/30 transition-colors">
              <CreditCard className="w-3 h-3" />
              <span>Deposit</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex space-x-1">
          <button
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              formData.side === 'buy'
                ? 'bg-green-500/90 hover:bg-green-500 text-white'
                : 'bg-purple-900/20 text-purple-300 hover:bg-purple-900/30'
            }`}
            onClick={() => setFormData(prev => ({ ...prev, side: 'buy' }))}
          >
            Buy BTC
          </button>
          <button
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              formData.side === 'sell'
                ? 'bg-red-500/90 hover:bg-red-500 text-white'
                : 'bg-purple-900/20 text-purple-300 hover:bg-purple-900/30'
            }`}
            onClick={() => setFormData(prev => ({ ...prev, side: 'sell' }))}
          >
            Sell BTC
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="text-purple-300">Type</label>
              <div className="flex space-x-1">
                <button
                  className={`px-2 py-1 rounded text-xxs ${
                    formData.type === 'limit'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-900/20 text-purple-300 hover:bg-purple-900/30'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'limit' }))}
                >
                  Limit
                </button>
                <button
                  className={`px-2 py-1 rounded text-xxs ${
                    formData.type === 'market'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-900/20 text-purple-300 hover:bg-purple-900/30'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'market' }))}
                >
                  Market
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-purple-300">Price</label>
            <div className="relative">
              <input
                type="number"
                className="w-full bg-purple-900/20 border border-purple-900/30 rounded-lg px-4 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
                value={formData.price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm">USDT</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-purple-300">Amount</label>
            <div className="relative">
              <input
                type="number"
                className="w-full bg-purple-900/20 border border-purple-900/30 rounded-lg px-4 py-2 text-purple-100 focus:outline-none focus:border-purple-500"
                value={formData.amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                step="0.0001"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm">BTC</span>
            </div>
            <div className="flex justify-between text-xxs text-purple-400 mt-1">
              <button className="hover:text-purple-300">25%</button>
              <button className="hover:text-purple-300">50%</button>
              <button className="hover:text-purple-300">75%</button>
              <button className="hover:text-purple-300">100%</button>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between text-sm text-purple-400 mb-2">
              <span>Total</span>
              <span>{formatNumber(formData.price * formData.amount)} USDT</span>
            </div>

            <button
              className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                formData.side === 'buy'
                  ? 'bg-green-500/90 hover:bg-green-500'
                  : 'bg-red-500/90 hover:bg-red-500'
              } text-white`}
            >
              {formData.side === 'buy' ? 'Buy' : 'Sell'} BTC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingForm;