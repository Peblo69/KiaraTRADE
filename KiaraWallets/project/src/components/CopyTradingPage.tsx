// src/components/CopyTradingPage.tsx
import React, { useState } from 'react';
import {
  ArrowLeft,
  Settings,
  Activity,
  Copy,
  Zap,
  Search,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Wallet,
  Percent,
  RefreshCw,
  Ban,
  Clock,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  CircleDollarSign,
  History,
  X,
} from 'lucide-react';

export interface CopySettings {
  enabled: boolean;
  solAllocation: number;
  maxTradeAmount: number;
  buyPercentage: number;
  copySells: boolean;
  slippage: number;
  gasFee: number;
  includedTokens: string[];
  excludedTokens: string[];
  minLiquidity: number;
  walletTag: string;
  onlyRenounced: boolean;
  excludePumpTokens: boolean;
  retries: number;
  autoSell: boolean;
}

export interface CopyWallet {
  id: string;
  address: string;
  tag: string;
  isActive: boolean;
  balanceSOL: number;
  balanceUSD: number;
  pnl24h: number;
  lastTrade: number;
  settings: CopySettings;
}

export interface TokenHolding {
  symbol: string;
  name: string;
  logo: string;
  amount: number;
  value: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  purchasePrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface TradeActivity {
  id: string;
  type: 'buy' | 'sell';
  token: {
    symbol: string;
    name: string;
    logo: string;
  };
  amount: number;
  price: number;
  value: number;
  timestamp: number;
  pnl?: number;
  pnlPercent?: number;
}

interface CopyTradingPageProps {
  onBack: () => void;
}

const mockHoldings: TokenHolding[] = [
  {
    symbol: 'SOL',
    name: 'Solana',
    logo: 'https://images.unsplash.com/photo-1677519910517-5a37a7451a9f?auto=format&fit=crop&w=40&h=40',
    amount: 12.5,
    value: 1562.5,
    price: 125.0,
    priceChange24h: 5.2,
    volume24h: 1234567890,
    purchasePrice: 115.0,
    pnl: 125.0,
    pnlPercent: 8.7,
  },
  {
    symbol: 'ORCA',
    name: 'Orca',
    logo: 'https://images.unsplash.com/photo-1676621982451-3e268da5bd4f?auto=format&fit=crop&w=40&h=40',
    amount: 1000,
    value: 1230.0,
    price: 1.23,
    priceChange24h: -2.1,
    volume24h: 9876543,
    purchasePrice: 1.15,
    pnl: 80.0,
    pnlPercent: 6.9,
  },
];

const mockTrades: TradeActivity[] = [
  {
    id: '1',
    type: 'buy',
    token: {
      symbol: 'SOL',
      name: 'Solana',
      logo: 'https://images.unsplash.com/photo-1677519910517-5a37a7451a9f?auto=format&fit=crop&w=40&h=40',
    },
    amount: 5.5,
    price: 120.3,
    value: 661.65,
    timestamp: Date.now() - 3600000,
  },
  {
    id: '2',
    type: 'sell',
    token: {
      symbol: 'ORCA',
      name: 'Orca',
      logo: 'https://images.unsplash.com/photo-1676621982451-3e268da5bd4f?auto=format&fit=crop&w=40&h=40',
    },
    amount: 500,
    price: 1.25,
    value: 625.0,
    timestamp: Date.now() - 7200000,
    pnl: 50.0,
    pnlPercent: 8.7,
  },
];

export function CopyTradingPage({ onBack }: CopyTradingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [walletData, setWalletData] = useState<any>(null);
  const [showCopyWallets, setShowCopyWallets] = useState(false);
  const [copySettings, setCopySettings] = useState<CopySettings>({
    enabled: false,
    solAllocation: 10,
    maxTradeAmount: 5,
    buyPercentage: 100,
    copySells: true,
    slippage: 25,
    gasFee: 0.0015,
    includedTokens: [],
    excludedTokens: [],
    minLiquidity: 1000,
    walletTag: '',
    onlyRenounced: true,
    excludePumpTokens: true,
    retries: 3,
    autoSell: false,
  });
  const [copyWallets, setCopyWallets] = useState<CopyWallet[]>([
    {
      id: '1',
      address: '7x8j9k2m3n4p5q6r8s9t0v1w2x3y4z5a6b7c8d9e0f',
      tag: 'Top Trader',
      isActive: true,
      balanceSOL: 1234.56,
      balanceUSD: 123456.78,
      pnl24h: 5.2,
      lastTrade: Date.now() - 300000,
      settings: {
        enabled: true,
        solAllocation: 10,
        maxTradeAmount: 5,
        buyPercentage: 100,
        copySells: true,
        slippage: 25,
        gasFee: 0.0015,
        includedTokens: [],
        excludedTokens: [],
        minLiquidity: 1000,
        walletTag: 'Top Trader',
        onlyRenounced: true,
        excludePumpTokens: true,
        retries: 3,
        autoSell: false,
      },
    },
    {
      id: '2',
      address: '8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r',
      tag: 'Degen Trader',
      isActive: false,
      balanceSOL: 567.89,
      balanceUSD: 56789.01,
      pnl24h: -2.1,
      lastTrade: Date.now() - 900000,
      settings: {
        enabled: false,
        solAllocation: 5,
        maxTradeAmount: 2,
        buyPercentage: 50,
        copySells: true,
        slippage: 20,
        gasFee: 0.0015,
        includedTokens: [],
        excludedTokens: [],
        minLiquidity: 500,
        walletTag: 'Degen Trader',
        onlyRenounced: true,
        excludePumpTokens: false,
        retries: 3,
        autoSell: true,
      },
    },
  ]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [holdings] = useState<TokenHolding[]>(mockHoldings);
  const [trades] = useState<TradeActivity[]>(mockTrades);

  const toggleWalletActive = (id: string) => {
    setCopyWallets((wallets) =>
      wallets.map((wallet) =>
        wallet.id === id ? { ...wallet, isActive: !wallet.isActive } : wallet
      )
    );
  };

  const saveWallet = () => {
    if (!walletData) return;
    const newWallet: CopyWallet = {
      id: Date.now().toString(),
      address: walletData.address,
      tag: copySettings.walletTag || 'Unnamed Wallet',
      isActive: copySettings.enabled,
      balanceSOL: walletData.balanceSOL,
      balanceUSD: walletData.balanceUSD,
      pnl24h: walletData.pnl24h,
      lastTrade: Date.now(),
      settings: { ...copySettings },
    };
    setCopyWallets((prev) => [...prev, newWallet]);
  };

  const handleSearch = () => {
    setWalletData({
      address: searchQuery,
      balanceSOL: 123.45,
      balanceUSD: 12345.67,
      pnl24h: 3.4,
    });
  };

  const handleSettingChange = (key: keyof CopySettings, value: any) => {
    setCopySettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const sortHoldings = (a: TokenHolding, b: TokenHolding) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'value':
        return (a.value - b.value) * multiplier;
      case 'pnl':
        return (a.pnl - b.pnl) * multiplier;
      case 'name':
        return a.name.localeCompare(b.name) * multiplier;
      default:
        return 0;
    }
  };

  const totalValue = holdings.reduce((sum, token) => sum + token.value, 0);
  const totalPNL = holdings.reduce((sum, token) => sum + token.pnl, 0);
  const totalPNLPercent = totalValue > 0 ? (totalPNL / (totalValue - totalPNL)) * 100 : 0;

  return (
    <>
      <div className="neon-border bg-kiara-dark/80 rounded-xl p-6">
        {/* Settings section content */}
      </div>
      <header className="neon-border bg-kiara-dark/90 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        {/* Header content */}
      </header>

      <div className={`fixed right-0 top-16 h-[calc(100vh-4rem)] z-40 transition-transform duration-300 transform ${showCopyWallets ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Copy wallets panel content */}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main content sections */}
      </main>
    </>
  );
}