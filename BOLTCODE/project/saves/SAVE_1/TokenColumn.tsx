import React, { useEffect, useState } from 'react';
import { Settings2, Globe } from 'lucide-react';

interface Token {
  id: number;
  name: string;
  icon: string;
  stats: {
    holders: string;
    buys: string;
  };
}

interface TokenColumnProps {
  title: string;
  statusColor: string;
  onFilter: () => void;
}

export function TokenColumn({ title, statusColor, onFilter }: TokenColumnProps) {
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newToken = {
        id: Date.now(),
        name: `Token-${Math.floor(Math.random() * 1000)}`,
        icon: 'B',
        stats: {
          holders: `${Math.floor(Math.random() * 100)}%`,
          buys: `${Math.floor(Math.random() * 100)}%`,
        },
      };

      setTokens(prev => [newToken, ...prev].slice(0, 5));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rpg-card p-4 min-h-[600px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 ${statusColor}`} />
          <span className="text-xs">{title}</span>
        </div>
        <button 
          onClick={onFilter}
          className="rpg-button"
        >
          Filter
        </button>
      </div>

      <div className="space-y-4">
        {tokens.map(token => (
          <div key={token.id} className="token-container">
            <div className="token rpg-border">
              <div className="flex items-center justify-between">
                <span className="text-xs">{token.name}</span>
                <div className="flex space-x-2">
                  <button className="pixel-icon">
                    <Settings2 className="w-4 h-4" />
                  </button>
                  <button className="pixel-icon">
                    <Globe className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-[10px] mt-2">
                <div>Holders: {token.stats.holders}</div>
                <div>Buys: {token.stats.buys}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}