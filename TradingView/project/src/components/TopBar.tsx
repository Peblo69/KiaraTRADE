import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, BarChart2, Shield, X, Bot, Send, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { useUnifiedTokenStore } from '@/lib/unified-token-store';
import { formatNumber } from '@/lib/utils';

interface SecurityItem {
  label: string;
  value: string;
  status?: 'success' | 'warning' | 'danger';
}

const TopBar: React.FC = () => {
  const [isSecurityPanelOpen, setIsSecurityPanelOpen] = useState(false);
  const [isKiaraPanelOpen, setIsKiaraPanelOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', content: "Hello! I am KIARA, your AI trading assistant. How can I help you today?" }
  ]);

  // Get current token data from the unified store
  const { currentToken, marketData } = useUnifiedTokenStore();

  const securityItems: SecurityItem[] = [
    { label: 'Is Mintable', value: currentToken?.isMintable ? 'YES' : 'NO', status: currentToken?.isMintable ? 'warning' : 'success' },
    { label: 'Is Token Data Mutable', value: currentToken?.isMutable ? 'YES' : 'NO', status: currentToken?.isMutable ? 'warning' : 'success' },
    { label: 'Is Freezable?', value: currentToken?.isFreezable ? 'YES' : 'NO', status: currentToken?.isFreezable ? 'warning' : 'success' },
    { label: 'Update Authority', value: currentToken?.updateAuthority?.slice(0, 6) || 'N/A', status: 'warning' },
    { label: 'Owner Balance', value: formatNumber(currentToken?.ownerBalance || 0), status: 'success' },
    { label: 'LP Burned', value: `${formatNumber(currentToken?.lpBurnedPercentage || 0)}%`, status: 'success' },
    { label: 'Top 10 Holders', value: `${formatNumber(currentToken?.top10HoldersPercentage || 0)}%`, status: 'success' },
    { label: 'Deployer Address', value: currentToken?.deployerAddress?.slice(0, 6) || 'N/A', status: 'warning' }
  ];

  const copyTokenAddress = () => {
    if (currentToken?.address) {
      navigator.clipboard.writeText(currentToken.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    setChatMessages(prev => [...prev, { type: 'user', content: message }]);
    setMessage('');

    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        type: 'ai', 
        content: "I understand you are interested in trading. Let me analyze the current market conditions and provide you with insights."
      }]);
    }, 1000);
  };

  return (
    <>
      <div className="bg-[#0D0B1F]/80 backdrop-blur-sm border-b border-purple-900/30 mb-4">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              {/* Token Information */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <img 
                    src={currentToken?.logoUrl || "https://cryptologos.cc/logos/unknown-token-logo.png"}
                    alt={currentToken?.symbol || "Token"}
                    className="w-6 h-6"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{currentToken?.symbol || "..."}</span>
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
                        <span className={`text-xs font-medium ${marketData?.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${formatNumber(marketData?.currentPrice || 0, 2)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <a
                          href={`https://solscan.io/token/${currentToken?.address}`}
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
                          href={`https://www.pump.fun/token/${currentToken?.address}`}
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

              {/* Market Stats - Updated to use real data */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-300 text-xs">Mkt Cap:</span>
                  <span className="text-purple-100 text-xs font-medium">
                    ${formatNumber(marketData?.marketCap || 0)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-300 text-xs">Liquidity:</span>
                  <span className="text-purple-100 text-xs font-medium">
                    ${formatNumber(marketData?.liquidity || 0)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-300 text-xs">24h Change:</span>
                  <span className={`text-xs font-medium ${marketData?.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatNumber(marketData?.priceChange24h || 0, 2)}%
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
      </div>

      {/* KIARA Vision Pro Panel */}
      {isKiaraPanelOpen && (
        <div className="fixed inset-y-0 left-0 w-80 bg-black/95 backdrop-blur-md transform z-50 flex flex-col border-r border-yellow-600/20">
          {/* Floating particles */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                width: Math.random() * 4 + 'px',
                height: Math.random() * 4 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                animationDelay: `${Math.random() * 2}s`,
                background: 'radial-gradient(circle at center, rgba(255, 215, 0, 0.3), transparent)'
              }}
            />
          ))}

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
              }`}>
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

      {/* Security Panel */}
      {isSecurityPanelOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-[#0A0818]/95 backdrop-blur-md transform z-50 flex flex-col border-l border-purple-900/30">
          <div className="flex items-center justify-between p-3 border-b border-[#2A2A2A]">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-medium text-[#E5E5E5]">Security Audit</h2>
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
                <h3 className="text-base font-medium text-[#E5E5E5] mb-2">No Security Issue Detected</h3>
                <p className="text-xs text-[#9CA3AF]">
                  If you proceed to trade, do so with caution and review the complete security audit carefully.
                </p>
              </div>

              <div className="space-y-3">
                {securityItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-[#2A2A2A]">
                    <span className="text-[#9CA3AF] text-xs">{item.label}</span>
                    <span className={`text-xs font-medium ${
                      item.status === 'success' ? 'text-[#10B981]' :
                      item.status === 'warning' ? 'text-[#FBBF24]' :
                      item.status === 'danger' ? 'text-[#EF4444]' :
                      'text-[#E5E5E5]'
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
            <button 
              className="w-full text-xs text-[#9CA3AF] hover:text-[#E5E5E5] transition-colors"
              onClick={() => setIsSecurityPanelOpen(false)}
            >
              Never show this again
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {(isSecurityPanelOpen || isKiaraPanelOpen) && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => {
            setIsSecurityPanelOpen(false);
            setIsKiaraPanelOpen(false);
          }}
        />
      )}
    </>
  );
};

export default TopBar;