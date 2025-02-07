import React, { useState } from 'react';
import { Bot, Search, X } from 'lucide-react';
import { Link } from 'wouter';
import img from '/logo.png'; //Import logo.png

export const TopBar: React.FC = () => {
  const [isKiaraPanelOpen, setIsKiaraPanelOpen] = useState(false);

  return (
    <header className="neon-border bg-[#0B0B1E]/90 backdrop-blur-md border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/">
              <a className="flex-shrink-0 flex items-center">
                <img
                  src={img} //Use the imported image
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
                <Search className="h-5 w-5 text-purple-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 bg-purple-900/10 border border-purple-500/20 rounded-lg 
                          text-purple-100 placeholder-purple-400/50 focus:outline-none focus:border-purple-500/50
                          focus:ring-1 focus:ring-purple-500/30"
                placeholder="Search..."
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
          </div>
        </div>
      </div>

      {/* KIARA Panel */}
      {isKiaraPanelOpen && (
        <>
          <div className="fixed inset-y-0 left-0 w-80 bg-black/95 backdrop-blur-md transform z-50 flex flex-col border-r border-yellow-600/20">
            <div className="p-4 border-b border-yellow-600/20">
              <div className="flex items-center justify-between">
                <h2 className="text-yellow-300 font-semibold">KIARA Vision Pro</h2>
                <button
                  onClick={() => setIsKiaraPanelOpen(false)}
                  className="text-yellow-500/70 hover:text-yellow-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <p className="text-yellow-300/70">
                Welcome to KIARA Vision Pro! Your AI-powered crypto analysis assistant.
              </p>
            </div>
          </div>
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={() => setIsKiaraPanelOpen(false)}
          />
        </>
      )}
    </header>
  );
};

export default TopBar;