import { useEffect, useState } from 'react';
import { heliusClient } from '@/lib/helius/client';
import { wsManager } from '@/lib/services/websocket';
import { TokenData } from '@/lib/helius/types';
import { Card } from "@/components/ui/card";
import TradeHistory from "@/components/TradeHistory";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";

interface Props {
  mint: string;
}

export default function TokenPage({ mint }: Props) {
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const token = usePumpPortalStore(state => state.getToken(mint));
    const addTradeToHistory = usePumpPortalStore(state => state.addTradeToHistory);

    console.log('🚨 COMPONENT LOADED WITH MINT:', mint);
    console.log('🤖 HELIUS CLIENT:', !!heliusClient);
    console.log('🌐 HELIUS CONNECTION:', !!heliusClient.connection);

    useEffect(() => {
        // FORCE INIT TEST
        console.log('🚀 STARTING HELIUS TEST');

        if (!import.meta.env.VITE_HELIUS_API_KEY) {
            console.error('❌ NO HELIUS KEY FOUND!');
            return;
        }

        // Test direct connection
        fetch(`https://api.helius.xyz/v0/token-metrics/${mint}?api-key=${import.meta.env.VITE_HELIUS_API_KEY}`)
            .then(res => res.json())
            .then(data => {
                console.log('✅ HELIUS DIRECT TEST:', data);
            })
            .catch(err => {
                console.error('💀 HELIUS TEST FAILED:', err);
            });

        try {
            console.log('🔌 Trying to connect to:', mint);

            heliusClient.subscribeToToken(mint)
                .then(() => {
                    console.log('✅ Subscribed successfully to:', mint);
                })
                .catch(err => {
                    console.error('❌ Subscribe failed:', err);
                    setError('Failed to subscribe to token updates');
                });

            // Debug WebSocket status
            wsManager.on('connected', (id) => {
                console.log('🔌 WEBSOCKET CONNECTED:', id);
            });

            wsManager.on('disconnected', (id) => {
                console.log('❌ WEBSOCKET DIED:', id);
            });

            // Listen for PumpPortal trades
            wsManager.on('trade', (tradeData) => {
                if (tradeData.mint === mint) {
                    console.log('🔥 NEW TRADE:', tradeData);
                    addTradeToHistory(mint, tradeData);
                }
            });

            return () => {
                console.log('🔄 Cleaning up subscription for:', mint);
                heliusClient.unsubscribe(mint);
            };
        } catch (error) {
            console.error('💀 SETUP BROKE:', error);
            setError('Something went wrong setting up token tracking');
        }
    }, [mint, addTradeToHistory]);

    if (error) {
        return (
            <div className="p-6">
                <Card className="p-4 bg-red-500/10 text-red-500">
                    {error}
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {token && (
                <Card className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <h3 className="text-sm text-purple-400 font-medium">Price</h3>
                            <p className="text-xl font-bold">${token.priceInUsd?.toFixed(8)}</p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm text-purple-400 font-medium">Market Cap</h3>
                            <p className="text-xl font-bold">${token.marketCapSol?.toFixed(2)}</p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm text-purple-400 font-medium">Volume</h3>
                            <p className="text-xl font-bold">${token.volume24h || '0.00'}</p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-sm text-purple-400 font-medium">Liquidity</h3>
                            <p className="text-xl font-bold">${token.vSolInBondingCurve?.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Trade History Component */}
            <TradeHistory tokenAddress={mint} />
        </div>
    );
}