import { FC, useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePumpPortalStore } from '@/lib/pump-portal-websocket';

interface LogMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export const DebugPanel: FC = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const isConnected = usePumpPortalStore(state => state.isConnected);
  const connectionError = usePumpPortalStore(state => state.connectionError);
  const tokens = usePumpPortalStore(state => state.tokens);

  useEffect(() => {
    // Override console.log to capture WebSocket related logs
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog.apply(console, args);
      const message = args.join(' ');
      if (message.includes('[PumpPortal')) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type: 'info'
        }].slice(-50)); // Keep last 50 logs
      }
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      const message = args.join(' ');
      if (message.includes('[PumpPortal')) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type: 'error'
        }].slice(-50));
      }
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  return (
    <Card className="p-4 mt-8 bg-gray-900/50 border-purple-500/20">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-purple-300 mb-2">Debug Panel</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-sm">
            <span className="text-gray-400">Connection Status: </span>
            <span className={isConnected ? "text-green-400" : "text-red-400"}>
              {isConnected ? "Connected" : connectionError || "Disconnected"}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Tracked Tokens: </span>
            <span className="text-purple-300">{tokens.length}</span>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[300px] rounded-md border border-purple-500/20">
        <div className="p-4 space-y-2">
          {logs.map((log, index) => (
            <div key={index} className="text-sm font-mono">
              <span className="text-gray-500">[{log.timestamp}]</span>
              <span className={`ml-2 ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' :
                'text-gray-300'
              }`}>
                {log.message}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              Waiting for WebSocket events...
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default DebugPanel;