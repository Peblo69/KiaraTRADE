import React from 'react';
import { Wallet, BarChart2, Users, Lock, PieChart } from 'lucide-react';

interface TokenDashboardProps {
  tokenName: string;
  price: {
    value: number;
    percentage: number;
  };
  volume: number;
  marketCap: number;
  metrics: {
    circulatingSupply: {
      value: number;
      percentage: number;
    };
    totalSupply: number;
    tvl: number;
    holders: number;
  };
  distribution: {
    team: number;
    publicSale: number;
    marketing: number;
    development: number;
    ecosystem: number;
  };
  loading?: boolean;
}

export function TokenDashboard({
  tokenName = "TOKEN",
  price = { value: 0.0, percentage: 0 },
  volume = 0,
  marketCap = 0,
  metrics = {
    circulatingSupply: { value: 0, percentage: 0 },
    totalSupply: 0,
    tvl: 0,
    holders: 0
  },
  distribution = {
    team: 15,
    publicSale: 40,
    marketing: 10,
    development: 20,
    ecosystem: 15
  },
  loading = false
}: TokenDashboardProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="bg-[#0B0F13]/10 backdrop-blur-xl rounded-lg border border-[#1F2937]/10 p-6 animate-pulse">
        <div className="h-8 bg-[#1F2937]/20 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[#1F2937]/20 rounded"></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#1F2937]/20 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-[#1F2937]/20 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0F13]/10 backdrop-blur-xl rounded-lg border border-[#1F2937]/10 p-6">
      {/* Token Header */}
      <div className="flex items-center space-x-3 mb-6">
        <h2 className="text-2xl font-bold metallic-text">
          💰 {tokenName}
        </h2>
      </div>

      {/* Price Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1F2937]/10 backdrop-blur-xl rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Current Price</div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-semibold">{formatCurrency(price.value)}</span>
            <span className={`text-sm ${price.percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {price.percentage >= 0 ? '+' : ''}{price.percentage}%
            </span>
          </div>
        </div>
        <div className="bg-[#1F2937]/10 backdrop-blur-xl rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">24h Volume</div>
          <div className="text-xl font-semibold">{formatCurrency(volume)}</div>
        </div>
        <div className="bg-[#1F2937]/10 backdrop-blur-xl rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Market Cap</div>
          <div className="text-xl font-semibold">{formatCurrency(marketCap)}</div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#1F2937]/10 backdrop-blur-xl rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart2 className="w-5 h-5 text-[#40E0D0]" />
            <span className="text-sm font-medium">Circulating Supply</span>
          </div>
          <div className="text-lg font-semibold">
            {formatNumber(metrics.circulatingSupply.value)}
            <span className="text-sm text-gray-400 ml-2">
              ({metrics.circulatingSupply.percentage}% of total)
            </span>
          </div>
        </div>
        <div className="bg-[#1F2937]/10 backdrop-blur-xl rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Wallet className="w-5 h-5 text-[#40E0D0]" />
            <span className="text-sm font-medium">Total Supply</span>
          </div>
          <div className="text-lg font-semibold">
            {formatNumber(metrics.totalSupply)} tokens
          </div>
        </div>
        <div className="bg-[#1F2937]/10 backdrop-blur-xl rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Lock className="w-5 h-5 text-[#40E0D0]" />
            <span className="text-sm font-medium">Total Value Locked</span>
          </div>
          <div className="text-lg font-semibold">{formatCurrency(metrics.tvl)}</div>
        </div>
        <div className="bg-[#1F2937]/10 backdrop-blur-xl rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-[#40E0D0]" />
            <span className="text-sm font-medium">Holders</span>
          </div>
          <div className="text-lg font-semibold">
            {formatNumber(metrics.holders)} addresses
          </div>
        </div>
      </div>

      {/* Token Distribution */}
      <div className="bg-[#1F2937]/10 backdrop-blur-xl rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <PieChart className="w-5 h-5 text-[#40E0D0]" />
          <h3 className="text-lg font-medium metallic-text">Token Distribution 📈</h3>
        </div>
        <div className="h-48 bg-[#2D3748]/20 rounded-lg mb-4 flex items-center justify-center">
          <span className="text-sm text-gray-400">Distribution Chart</span>
        </div>
        <div className="space-y-2">
          {Object.entries(distribution).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className="text-sm font-medium">{value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}