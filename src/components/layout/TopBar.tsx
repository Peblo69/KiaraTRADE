import React, { useState } from 'react';
import { TrendingUp, DollarSign, BarChart2, Shield, X, Bot, Send, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface Props {
  tokenAddress?: string;
}

export const TopBar: React.FC<Props> = ({ tokenAddress }) => {
  const [isSecurityPanelOpen, setIsSecurityPanelOpen] = useState(false);
  const [isKiaraPanelOpen, setIsKiaraPanelOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', content: "Hello! I am KIARA, your AI trading assistant. How can I help you today?" }
  ]);

  // Get token data from PumpPortal store
  const token = usePumpPortalStore(state => state.getToken(tokenAddress || ''));

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

  return (
    <header className="neon-border bg-[#0B0B1E]/90 backdrop-blur-md border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/">
              <a className="flex-shrink-0 flex items-center">
                <img
                  src="/logo.png"
                  alt="Kiara Vision"
                  className="h-8 w-8 rounded-full"
                />
                <span className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  Kiara Vision
                </span>
              </a>
            </Link>
          </div>

          <div className="flex-1 max-w-xl px-8 hidden lg:flex">
            <div className="w-full relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BarChart2 className="h-5 w-5 text-purple-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 bg-purple-900/10 border border-purple-500/20 rounded-lg 
                          text-purple-100 placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50
                          focus:ring-1 focus:ring-purple-500/30"
                placeholder="Search tokens..."
              />
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

            {tokenAddress && (
              <button 
                className="btn-secondary flex items-center space-x-1 cursor-pointer"
                onClick={() => setIsSecurityPanelOpen(true)}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Safe</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security Panel */}
      {isSecurityPanelOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-[#0A0818]/95 backdrop-blur-md transform z-50 flex flex-col border-l border-purple-900/30">
          {/* Panel content */}
        </div>
      )}

      {/* KIARA Panel */}
      {isKiaraPanelOpen && (
        <div className="fixed inset-y-0 left-0 w-80 bg-black/95 backdrop-blur-md transform z-50 flex flex-col border-r border-yellow-600/20">
          {/* Panel content */}
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
    </header>
  );
};

export default TopBar;