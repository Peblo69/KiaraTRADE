import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, DollarSign, BarChart2, Shield, X, Bot, Send, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { usePumpPortalStore } from '../lib/pump-portal-store';
import { formatNumber } from '../lib/utils';

interface TopBarProps {
  tokenAddress?: string;
}

const TopBar: React.FC<TopBarProps> = ({ tokenAddress }) => {
  const [isSecurityPanelOpen, setIsSecurityPanelOpen] = useState(false);
  const [isKiaraPanelOpen, setIsKiaraPanelOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', content: "Hello! I am KIARA, your AI trading assistant. How can I help you today?" }
  ]);

  // Get token data from PumpPortal store
  const token = usePumpPortalStore(state => tokenAddress ? state.getToken(tokenAddress) : undefined);

  // Memoize market stats calculations to prevent unnecessary recalculations
  const marketStats = useMemo(() => {
    if (!token) {
      return {
        symbol: 'Loading...',
        name: 'Loading...',
        price: 0,
        marketCap: 0,
        liquidity: 0,
        priceChange24h: 0,
        imageUrl: ''
      };
    }

    let priceChange24h = 0;
    if (token.recentTrades?.length > 0) {
      const trades = token.recentTrades;
      const now = Date.now();
      const trades24h = trades.filter(t => t.timestamp > now - 24 * 60 * 60 * 1000);

      if (trades24h.length >= 2) {
        const latestPrice = trades24h[0].priceInUsd;
        const oldestPrice = trades24h[trades24h.length - 1].priceInUsd;
        priceChange24h = ((latestPrice - oldestPrice) / oldestPrice) * 100;
      }
    }

    return {
      symbol: token.symbol,
      name: token.name,
      price: token.priceInUsd || 0,
      marketCap: token.marketCapSol || 0,
      liquidity: token.vSolInBondingCurve || 0,
      priceChange24h,
      imageUrl: token.metadata?.imageUrl || token.imageUrl
    };
  }, [token]);

  const copyTokenAddress = () => {
    if (tokenAddress) {
      navigator.clipboard.writeText(tokenAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    setChatMessages(prev => [...prev, { type: 'user', content: message }]);
    setMessage('');

    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        type: 'ai',
        content: "I understand you are interested in trading. Let me analyze the current market conditions and provide you with insights."
      }]);
    }, 1000);
  };

  // Loading state
  if (!token) {
    return (
      <div className="bg-[#0D0B1F]/80 backdrop-blur-sm border-b border-purple-900/30 mb-4 animate-pulse">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-purple-900/20 rounded"></div>
            <div className="h-6 w-48 bg-purple-900/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0D0B1F]/80 backdrop-blur-sm border-b border-purple-900/30 mb-4">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <img
                  src={marketStats.imageUrl || "https://cryptologos.cc/logos/bitcoin-btc-logo.png"}
                  alt={marketStats.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = "https://cryptologos.cc/logos/bitcoin-btc-logo.png";
                  }}
                />
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{marketStats.symbol}</span>
                    <button
                      onClick={copyTokenAddress}
                      className="p-1 hover:bg-purple-900/40 rounded transition-colors"
                    >
                      {copiedAddress ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-purple-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                      <span className={`text-xs font-medium ${marketStats.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${formatNumber(marketStats.price)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <a
                        href={`https://solscan.io/token/${tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-purple-900/40 rounded transition-colors"
                      >
                        <img
                          src="https://solscan.io/favicon.ico"
                          alt="Solscan"
                          className="w-3.5 h-3.5"
                        />
                      </a>
                      <a
                        href={`https://www.pump.fun/token/${tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-purple-900/40 rounded transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 text-xs">Mkt Cap:</span>
                <span className="text-purple-100 text-xs font-medium">${formatNumber(marketStats.marketCap)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 text-xs">Liquidity:</span>
                <span className="text-purple-100 text-xs font-medium">${formatNumber(marketStats.liquidity)}</span>
              </div>

              <div className="flex items-center space-x-2">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 text-xs">24h:</span>
                <span className={`text-xs font-medium ${marketStats.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {marketStats.priceChange24h.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              className="btn-kiara flex items-center space-x-1 cursor-pointer"
              onClick={() => setIsKiaraPanelOpen(true)}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>KIARA VISION PRO</span>
            </button>

            <button
              className="btn-secondary flex items-center space-x-1 cursor-pointer"
              onClick={() => setIsSecurityPanelOpen(true)}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Safe</span>
            </button>

            <div className="flex space-x-1.5">
              <button className="btn-secondary">5M</button>
              <button className="btn-secondary">1H</button>
              <button className="btn-secondary">4H</button>
            </div>
          </div>
        </div>
      </div>

      {isSecurityPanelOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-[#0A0818]/95 backdrop-blur-md transform z-50 flex flex-col border-l border-purple-900/30">
          <div className="flex items-center justify-between p-3 border-b border-[#2A2A2A]">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-medium text-[#E5E5E5]">Security Check</h2>
            </div>
            <button
              className="text-purple-400 hover:text-purple-300 p-1"
              onClick={() => setIsSecurityPanelOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-base font-medium text-[#E5E5E5] mb-2">Security Check</h3>
                <p className="text-xs text-[#9CA3AF]">
                  Review the complete security audit carefully before proceeding.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Is Mintable', value: token?.metadata?.mint ? 'YES' : 'NO', status: token?.metadata?.mint ? 'danger' : 'success' },
                  { label: 'Is Token Data Mutable', value: token?.metadata?.uri ? 'YES' : 'NO', status: token?.metadata?.uri ? 'warning' : 'success' },
                  { label: 'Liquidity', value: formatNumber(token?.vSolInBondingCurve || 0), status: token?.vSolInBondingCurve ? 'success' : 'warning' },
                  { label: 'Market Cap', value: formatNumber(token?.marketCapSol || 0), status: 'success' },
                  { label: 'Dev Wallet', value: token?.devWallet?.slice(0, 6) || 'N/A', status: 'warning' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-[#2A2A2A]">
                    <span className="text-[#9CA3AF] text-xs">{item.label}</span>
                    <span className={`text-xs font-medium ${
                      item.status === 'success' ? 'text-[#10B981]' :
                        item.status === 'warning' ? 'text-[#FBBF24]' :
                          'text-[#EF4444]'
                    }`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[#2A2A2A] space-y-2">
            <button
              className="w-full bg-[#00875A] hover:bg-[#00875A]/90 text-white py-2 rounded-md text-sm font-medium transition-all duration-200"
              onClick={() => setIsSecurityPanelOpen(false)}
            >
              Proceed to Trade
            </button>
          </div>
        </div>
      )}

      {isKiaraPanelOpen && (
        <div className="fixed inset-y-0 left-0 w-80 bg-black/95 backdrop-blur-md transform z-50 flex flex-col border-r border-yellow-600/20">
          <div className="flex items-center justify-between p-3 border-b border-[#2A2A2A]">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-[#FFD700]" />
              <h2 className="text-sm font-medium text-[#E5E5E5]">KIARA Vision Pro</h2>
            </div>
            <button
              className="text-[#FFD700] hover:text-[#FFA500] p-1"
              onClick={() => setIsKiaraPanelOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.type} ${
                msg.type === 'ai'
                  ? 'bg-[#1A1A1A] text-[#E5E5E5]'
                  : 'bg-[#2A2A2A] text-[#E5E5E5]'
              } p-3 rounded-lg`}>
                {msg.content}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[#2A2A2A]">
            <div className="flex space-x-2">
              <input
                type="text"
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2 text-sm text-[#E5E5E5] w-full focus:outline-none focus:border-[#FFD700]/50 focus:ring-2 focus:ring-[#FFD700]/20"
                placeholder="Ask KIARA..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button
                className="bg-[#FFD700] text-[#1A1A1A] px-4 py-2 rounded-lg hover:bg-[#FFD700]/90 transition-all duration-200"
                onClick={sendMessage}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {(isSecurityPanelOpen || isKiaraPanelOpen) && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => {
            setIsSecurityPanelOpen(false);
            setIsKiaraPanelOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default React.memo(TopBar);