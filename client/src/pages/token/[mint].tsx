import { useEffect, useState } from 'react';
import { wsManager } from '@/lib/services/websocket';
import { Card } from "@/components/ui/card";

interface Props {
  mint: string;
}

export default function TokenPage({ mint }: Props) {
    const [tokenData, setTokenData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
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

            // Listen for WebSocket status
            wsManager.on('connected', (id) => {
                console.log('🔌 WEBSOCKET CONNECTED:', id);
            });

            wsManager.on('disconnected', (id) => {
                console.log('❌ WEBSOCKET DISCONNECTED:', id);
            });

            // Handle PumpPortal updates
            wsManager.on('pumpUpdate', (data) => {
                console.log('📨 Received update:', data);
                if (data.mint === mint) {
                    setTokenData(data);
                }
            });

            return () => {
                console.log('🔄 Cleaning up subscription for:', mint);
                wsManager.removeAllListeners('pumpUpdate');
            };
        } catch (error) {
            console.error('💀 SETUP ERROR:', error);
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
                            Price: {tokenData.priceInSol?.toFixed(8)} SOL
                        </h2>
                        <h3 className="text-xl mb-6">
                            Market Cap: {tokenData.marketCapSol?.toFixed(2)} SOL
                        </h3>
                        <div>
                            <h4 className="text-lg font-semibold mb-4">Trade Info</h4>
                            <div className="space-y-2">
                                <div className="p-2 bg-gray-800/50 rounded">
                                    Bonding Curve: {tokenData.bondingCurveKey}
                                </div>
                                <div className="p-2 bg-gray-800/50 rounded">
                                    Tokens In Curve: {tokenData.vTokensInBondingCurve}
                                </div>
                            </div>
                        </div>
                    </Card>
                </>
            ) : (
                <div className="text-center py-8">Loading token data...</div>
            )}
        </div>
    );
}