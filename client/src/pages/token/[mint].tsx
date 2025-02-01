import { useEffect } from 'react';
import { wsManager } from '@/lib/services/websocket';
import { Card } from "@/components/ui/card";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";

interface Props {
  mint: string;
}

// Make sure this matches PumpPortal's format
interface Trade {
  signature: string;
  timestamp: number;
  mint: string;
  txType: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  priceInUsd: number;
  traderPublicKey: string;
}

export default function TokenPage({ mint }: Props) {
    // Get everything we need from PumpPortal store
    const token = usePumpPortalStore(state => state.getToken(mint));
    const addTradeToHistory = usePumpPortalStore(state => state.addTradeToHistory);
    const addToViewedTokens = usePumpPortalStore(state => state.addToViewedTokens);
    const setActiveTokenView = usePumpPortalStore(state => state.setActiveTokenView);

    useEffect(() => {
        console.log('🚀 Setting up token view:', mint);

        // Set this token as active
        addToViewedTokens(mint);
        setActiveTokenView(mint);

        // Listen for trades
        wsManager.on('trade', (tradeData: Trade) => {
            if (tradeData.mint === mint) {
                console.log('💰 New trade:', tradeData);
                addTradeToHistory(mint, tradeData);
            }
        });

        return () => {
            setActiveTokenView(null);
            wsManager.off('trade');
        };
    }, [mint, addToViewedTokens, setActiveTokenView, addTradeToHistory]);

    if (!token) {
        return (
            <div className="p-6">
                <Card className="p-6">
                    <p>Loading token data... 🚀</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Price Card */}
            <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                    {token.name} ({token.symbol})
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-gray-400">Price</p>
                        <p className="text-2xl font-bold">
                            ${token.priceInUsd?.toFixed(6) || '0.000000'}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-400">24h Volume</p>
                        <p className="text-xl">
                            ${token.volume24h?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Trade History */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Recent Trades</h2>
                <div className="space-y-2">
                    {token.recentTrades?.map((trade, i) => (
                        <div 
                            key={`${trade.signature}-${i}`}
                            className={`p-3 rounded flex justify-between items-center ${
                                trade.txType === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'
                            }`}
                        >
                            <div>
                                <span className={trade.txType === 'buy' ? 'text-green-400' : 'text-red-400'}>
                                    {trade.txType.toUpperCase()}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm opacity-75">
                                    {trade.tokenAmount.toFixed(2)} tokens
                                </div>
                                <div className="font-bold">
                                    ${trade.priceInUsd?.toFixed(6)}
                                </div>
                            </div>
                            <div className="text-sm opacity-50">
                                {new Date(trade.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    ))}
                    {(!token.recentTrades || token.recentTrades.length === 0) && (
                        <p className="text-center text-gray-400">
                            No trades yet... 🎯
                        </p>
                    )}
                </div>
            </Card>

            {/* Token Info */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Token Info</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-gray-400">Market Cap (SOL)</p>
                        <p className="text-xl">
                            {token.marketCapSol?.toFixed(2) || '0.00'} SOL
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-400">Market Cap (USD)</p>
                        <p className="text-xl">
                            ${(token.marketCapSol * token.priceInUsd)?.toFixed(2) || '0.00'}
                        </p>
                    </div>
                </div>
                {token.socials && (
                    <div className="mt-4">
                        <p className="text-gray-400 mb-2">Links</p>
                        <div className="flex space-x-4">
                            {token.socials.website && (
                                <a href={token.socials.website} target="_blank" rel="noopener noreferrer" 
                                   className="text-blue-400 hover:text-blue-300">
                                    Website
                                </a>
                            )}
                            {token.socials.twitter && (
                                <a href={token.socials.twitter} target="_blank" rel="noopener noreferrer"
                                   className="text-blue-400 hover:text-blue-300">
                                    Twitter
                                </a>
                            )}
                            {token.socials.telegram && (
                                <a href={token.socials.telegram} target="_blank" rel="noopener noreferrer"
                                   className="text-blue-400 hover:text-blue-300">
                                    Telegram
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}