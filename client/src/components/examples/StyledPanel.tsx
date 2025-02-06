import React from 'react';
import { ArrowUpRight, Sparkles, Star } from 'lucide-react';

export function StyledPanel() {
  return (
    <div className="relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 animate-gradient" />
      
      {/* Main panel with neon border and glass effect */}
      <div className="neon-border bg-kiara-dark/80 backdrop-blur-md rounded-xl p-6 relative z-10">
        {/* Gradient animated heading */}
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 animate-pulse">
          Custom Styled Panel
        </h2>
        
        {/* Grid layout with hover effects */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 hover:bg-purple-900/30 transition-all duration-300 group">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-400 group-hover:text-purple-300 transition-colors" size={20} />
              <span className="text-purple-200">Feature One</span>
            </div>
            <p className="text-purple-400 text-sm mt-2">
              Hover me to see the effect
            </p>
          </div>
          
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 hover:bg-purple-900/30 transition-all duration-300 group">
            <div className="flex items-center gap-2">
              <Star className="text-purple-400 group-hover:text-purple-300 transition-colors" size={20} />
              <span className="text-purple-200">Feature Two</span>
            </div>
            <p className="text-purple-400 text-sm mt-2">
              Custom animations included
            </p>
          </div>
        </div>
        
        {/* Stats with animations */}
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center p-3 hover:bg-purple-900/20 rounded-lg transition-all duration-300">
            <span className="text-purple-300">Metric One</span>
            <span className="flex items-center text-green-400 gap-1">
              <ArrowUpRight size={16} />
              +25%
            </span>
          </div>
          <div className="flex justify-between items-center p-3 hover:bg-purple-900/20 rounded-lg transition-all duration-300">
            <span className="text-purple-300">Metric Two</span>
            <span className="flex items-center text-green-400 gap-1">
              <ArrowUpRight size={16} />
              +42%
            </span>
          </div>
        </div>
        
        {/* Custom button */}
        <button className="w-full mt-6 cyber-button flex items-center justify-center gap-2 group">
          <span>Interactive Button</span>
          <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
