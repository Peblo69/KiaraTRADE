import { useEffect, useState } from 'react';
import { heliusClient } from '@/lib/helius/client';
import { wsManager } from '@/lib/services/websocket';
import { TokenData } from '@/lib/helius/types';
import { Card } from "@/components/ui/card";

interface Props {
  mint: string;
}

export default function TokenPage({ mint }: Props) {
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            // Subscribe to that shit
            heliusClient.subscribeToToken(mint)
                .catch(err => {
                    console.error('💀 SHIT BROKE:', err);
                    setError('Failed to subscribe to token updates');
                });

            // Listen for updates
            wsManager.on('heliusUpdate', (data) => {
                if (data.mint === mint) {
                    console.log('🔥 NEW PRICE:', data.stats.priceUSD);
                    setTokenData(data);
                }
            });

            // Clean that shit up
            return () => heliusClient.unsubscribe(mint);
        } catch (error) {
            console.error('💀 SHIT BROKE:', error);
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
        <div className="p-6">
            {tokenData ? (
                <>
                    <Card className="p-6 space-y-4">
                        <h2 className="text-2xl font-bold mb-4">
                            Price: ${tokenData.stats.priceUSD?.toFixed(4)}
                        </h2>
                        <h3 className="text-xl mb-6">
                            24h Volume: ${tokenData.stats.volume24h?.toFixed(2)}
                        </h3>
                        <div>
                            <h4 className="text-lg font-semibold mb-4">Recent Trades</h4>
                            <div className="space-y-2">
                                {tokenData.recentTrades.map((trade, i) => (
                                    <div key={i} className="p-2 bg-gray-800/50 rounded">
                                        Price: ${trade.priceUSD?.toFixed(4)} | Amount: {trade.tokenAmount}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </>
            ) : (
                <div className="text-center py-8">Loading that 🔥...</div>
            )}
        </div>
    );
}