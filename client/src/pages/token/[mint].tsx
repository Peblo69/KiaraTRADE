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

            // Debug incoming data
            wsManager.on('heliusUpdate', (data) => {
                console.log('📨 Received update:', data);
                if (data.mint === mint) {
                    console.log('🔥 NEW PRICE:', data.stats?.priceUSD);
                    setTokenData(data);
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
    }, [mint]);

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
            {tokenData && (
                <Card className="p-6">
                    <h2 className="text-2xl font-bold mb-4">
                        Price: ${tokenData.stats.priceUSD?.toFixed(4)}
                    </h2>
                    <h3 className="text-xl mb-6">
                        24h Volume: ${tokenData.stats.volume24h?.toFixed(2)}
                    </h3>
                </Card>
            )}

            {/* Trade History Component */}
            <TradeHistory tokenAddress={mint} />
        </div>
    );
}