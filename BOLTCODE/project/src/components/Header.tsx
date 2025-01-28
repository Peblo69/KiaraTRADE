import React, { useState, useCallback } from 'react';
import { 
  Settings2, 
  Search, 
  Star, 
  ArrowDownUp, 
  Zap, 
  BarChart2, 
  Settings, 
  History 
} from 'lucide-react';
import { useTokenContext } from '../context/TokenContext';
import { useWalletContext } from '../context/WalletContext';
import { useSearchContext } from '../context/SearchContext';
import { Chain, SearchResult, WalletBalance } from '../types/trading';

export function Header() {
  // Context hooks
  const { selectedChain, setSelectedChain, availableChains } = useTokenContext();
  const { balance, connectWallet, addFunds } = useWalletContext();
  const { searchResults, setSearchQuery, isSearching } = useSearchContext();

  // Local state
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeDexes, setActiveDexes] = useState(3);

  // Search handling
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setShowSearchResults(!!query);
  }, [setSearchQuery]);

  // Chain selection
  const handleChainSelect = useCallback(async (chain: Chain) => {
    try {
      await setSelectedChain(chain);
    } catch (error) {
      console.error('Failed to switch chain:', error);
      // Handle error (show notification, etc)
    }
  }, [setSelectedChain]);

  // Buy action
  const handleBuyClick = useCallback(async () => {
    if (!balance) {
      const connected = await connectWallet();
      if (!connected) return;
    }
    // Open buy modal/navigate to buy page
  }, [balance, connectWallet]);

  // Settings management
  const handleSettingsClick = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  return (
    <header className="px-4 py-2 bg-[#2D1B4C]/10 backdrop-blur-xl border-b border-[#40E0D0]/5">
      <div className="flex items-center justify-between">
        {/* Logo and Chain Selection */}
        <div className="flex items-center space-x-4">
          {/* Logo - Links to home/dashboard */}
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-[#40E0D0]" />
            <span className="font-orbitron font-bold text-[#40E0D0]">Kiara Vision</span>
          </div>
          
          {/* Chain Selection Buttons */}
          <div className="flex space-x-2">
            <button 
              onClick={() => handleChainSelect('all')}
              className="cosmic-button bg-[#2D1B4C]/10"
              data-testid="chain-all"
            >
              All Chains
            </button>
            
            <button 
              onClick={() => handleChainSelect('solana')}
              className="cosmic-button bg-[#2D1B4C]/10 flex items-center space-x-1"
              data-testid="chain-solana"
            >
              <img 
                src="https://cryptologos.cc/logos/solana-sol-logo.png" 
                className="w-4 h-4" 
                alt="Solana" 
              />
              <span>SOLANA</span>
            </button>
            
            <button 
              onClick={() => handleChainSelect('tron')}
              className="cosmic-button bg-[#2D1B4C]/10 flex items-center space-x-1"
              data-testid="chain-tron"
            >
              <img 
                src="https://cryptologos.cc/logos/tron-trx-logo.png" 
                className="w-4 h-4" 
                alt="TRON" 
              />
              <span>TRON</span>
            </button>
          </div>
        </div>

        {/* Trading Controls */}
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              onChange={(e) => handleSearch(e.target.value)}
              className="bg-[#2D1B4C]/5 border border-[#40E0D0]/5 rounded-md px-3 py-1 pl-8 text-sm focus:border-[#40E0D0]/10 focus:ring-1 focus:ring-[#40E0D0]/10 transition-all"
              data-testid="search-input"
            />
            <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-[#40E0D0]" />
            
            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full mt-1 w-full bg-[#0A0A0F] border border-[#40E0D0]/10 rounded-md shadow-lg">
                {isSearching ? (
                  <div className="p-2 text-sm text-gray-400">Searching...</div>
                ) : searchResults?.length ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      className="w-full p-2 text-left hover:bg-[#2D1B4C]/10 text-sm"
                      onClick={() => {/* Handle result selection */}}
                    >
                      {result.name}
                    </button>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-400">No results found</div>
                )}
              </div>
            )}
          </div>
          
          {/* Trading Controls */}
          <div className="flex items-center space-x-2">
            {/* Charts Button */}
            <button 
              className="cosmic-icon"
              onClick={() => {/* Toggle charts view */}}
              data-testid="charts-button"
            >
              <BarChart2 className="w-5 h-5" />
            </button>

            {/* Settings Button */}
            <button 
              className="cosmic-icon"
              onClick={handleSettingsClick}
              data-testid="settings-button"
            >
              <Settings2 className="w-5 h-5" />
            </button>

            {/* Active DEXes Indicator */}
            <div className="cosmic-button bg-[#2D1B4C]/10">
              <span className="text-sm">{activeDexes}</span>
              <span className="ml-2 text-sm">Dexes</span>
            </div>

            {/* Buy Button */}
            <button 
              className="cosmic-button bg-[#40E0D0]/40 text-[#2D1B4C] hover:bg-[#40E0D0]/30 flex items-center"
              onClick={handleBuyClick}
              data-testid="buy-button"
            >
              <Zap className="w-4 h-4 mr-1" />
              BUY
            </button>

            {/* Wallet Balance */}
            <div className="flex items-center space-x-1 text-[#40E0D0]">
              <span className="text-sm">{balance?.formatted || '0'}</span>
              <span className="text-sm">$</span>
            </div>

            {/* Advanced Trading Button */}
            <button 
              className="cosmic-button bg-[#2D1B4C]/10 flex items-center space-x-1"
              onClick={() => {/* Toggle advanced trading */}}
              data-testid="advanced-button"
            >
              <BarChart2 className="w-4 h-4" />
              <span className="text-sm">Advanced</span>
            </button>

            {/* History Button */}
            <button 
              className="cosmic-icon"
              onClick={() => {/* Show trading history */}}
              data-testid="history-button"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Dropdown */}
      {showSettings && (
        <div className="absolute top-full right-4 mt-1 bg-[#0A0A0F] border border-[#40E0D0]/10 rounded-md shadow-lg p-4">
          {/* Settings content */}
        </div>
      )}
    </header>
  );
}