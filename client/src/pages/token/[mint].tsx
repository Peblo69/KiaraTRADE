import { useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { usePumpPortalStore } from "@/lib/pump-portal-websocket";
import { useHeliusStore } from "@/lib/helius-store";
import TradeHistory from "@/components/TradeHistory";

interface Props {
  mint: string;
}

export default function TokenPage({ mint }: Props) {
  const pumpToken = usePumpPortalStore(state => state.getToken(mint));
  const heliusTrades = useHeliusStore(state => state.trades[mint] || []);

  useEffect(() => {
    console.log('🟣 PumpPortal Token:', pumpToken);
    console.log('🔵 Helius Trades:', heliusTrades);

    useHeliusStore.getState().subscribeToToken(mint);

    const debugMessage = (event: MessageEvent) => {
      console.log('🔥 RAW WS MESSAGE:', event.data);
    };

    // Debug WebSocket messages
    const ws = new WebSocket('wss://pumpportal.fun/api/data');
    ws.addEventListener('message', debugMessage);

    return () => {
      ws.removeEventListener('message', debugMessage);
      ws.close();
    };
  }, [mint]);

  return (
    <div className="p-6 space-y-6">
      {/* Debug Info */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-purple-100 mb-2">Debug Info</h2>
        <div className="text-sm text-purple-400">
          <p>PumpPortal Connected: {usePumpPortalStore.getState().isConnected ? '✅' : '❌'}</p>
          <p>Helius Connected: {useHeliusStore.getState().isConnected ? '✅' : '❌'}</p>
          <p>Token Address: {mint}</p>
          <p>PumpPortal Trades: {pumpToken?.recentTrades?.length || 0}</p>
          <p>Helius Trades: {heliusTrades?.length || 0}</p>
        </div>
      </Card>

      <TradeHistory tokenAddress={mint} />
    </div>
  );
}