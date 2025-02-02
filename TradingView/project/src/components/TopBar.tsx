import React, { useState } from 'react';
import { TrendingUp, Clock, DollarSign, BarChart2, Shield, X, Copy, CheckCircle, ExternalLink } from 'lucide-react';

interface SecurityItem {
  label: string;
  value: string;
  status?: 'success' | 'warning' | 'danger';
}

const TopBar: React.FC = () => {
  const [isSecurityPanelOpen, setIsSecurityPanelOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const securityItems: SecurityItem[] = [
    { label: 'Is Mintable', value: 'NO', status: 'success' },
    { label: 'Is Token Data Mutable', value: 'NO', status: 'success' },
    { label: 'Is Freezable?', value: 'NO', status: 'success' },
    { label: 'Update Authority', value: 'LVDD1P', status: 'warning' },
    { label: 'Owner Balance', value: '0', status: 'success' },
    { label: 'LP Burned', value: '100%', status: 'success' },
    { label: 'Top 10 Holders', value: '1.07%', status: 'success' },
    { label: 'Deployer Address', value: 'ROPARL', status: 'warning' }
  ];

  const copyTokenAddress = () => {
    navigator.clipboard.writeText("0x1234...5678"); // Replace with actual token address
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
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
                    src="https://cryptologos.cc/logos/bitcoin-btc-logo.png" 
                    alt="BTC"
                    className="w-6 h-6"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">BTC</span>
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
                        <span className="text-green-400 text-xs font-medium">$46,789.00</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <a
                          href="https://solscan.io/token/YOUR_TOKEN_ADDRESS"
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
                          href="https://www.pump.fun/token/YOUR_TOKEN_ADDRESS"
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

              {/* Market Stats */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-300 text-xs">Mkt Cap:</span>
                  <span className="text-purple-100 text-xs font-medium">$4.44K</span>
                </div>

                <div className="flex items-center space-x-2">
                  <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-300 text-xs">Liquidity:</span>
                  <span className="text-purple-100 text-xs font-medium">$6.89K</span>
                </div>

                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-300 text-xs">B.Curve:</span>
                  <span className="text-green-400 text-xs font-medium">0.32%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
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

      {/* Security Panel */}
      {isSecurityPanelOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-[#0A0818] transform z-50 flex flex-col border-l border-purple-900/30">
          <div className="flex items-center justify-between p-3 border-b border-purple-900/30">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-medium text-white">Security Audit</h2>
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
                <h3 className="text-base font-medium text-white mb-2">No Security Issue Detected</h3>
                <p className="text-xs text-purple-300">
                  If you proceed to trade, do so with caution and review the complete security audit carefully.
                </p>
              </div>

              <div className="space-y-3">
                {securityItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-purple-900/20">
                    <span className="text-purple-300 text-xs">{item.label}</span>
                    <span className={`text-xs font-medium ${
                      item.status === 'success' ? 'text-green-400' :
                      item.status === 'warning' ? 'text-yellow-400' :
                      item.status === 'danger' ? 'text-red-400' :
                      'text-white'
                    }`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-purple-900/30 space-y-2">
            <button 
              className="w-full btn-success py-2"
              onClick={() => setIsSecurityPanelOpen(false)}
            >
              Proceed to Trade
            </button>
            <button 
              className="w-full text-xs text-purple-400 hover:text-purple-300"
              onClick={() => setIsSecurityPanelOpen(false)}
            >
              Never show this again
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isSecurityPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsSecurityPanelOpen(false)}
        />
      )}
    </>
  );
};

export default TopBar;