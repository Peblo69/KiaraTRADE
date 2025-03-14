import { FC, useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Terminal } from "lucide-react";

interface LogMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export const DebugPanel: FC = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Override console.log to capture logs
    const originalLog = console.log;
    const originalError = console.error;

    const formatValue = (value: any): string => {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value === 'object') {
        // Skip empty objects
        if (Object.keys(value).length === 0) return '';
        try {
          return JSON.stringify(value, null, 2);
        } catch (e) {
          return String(value);
        }
      }
      return String(value);
    };

    console.log = (...args) => {
      originalLog.apply(console, args);
      const formattedMessage = args
        .map(formatValue)
        .filter(Boolean) // Remove empty strings
        .join(' ');

      if (formattedMessage) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          message: formattedMessage,
          type: 'info'
        }].slice(-50)); // Keep last 50 logs
      }
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      const formattedMessage = args
        .map(formatValue)
        .filter(Boolean)
        .join(' ');

      if (formattedMessage) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          message: formattedMessage,
          type: 'error'
        }].slice(-50));
      }
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const toggleVisibility = () => setIsVisible(!isVisible);

  if (!isVisible) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-50"
        onClick={toggleVisibility}
        variant="outline"
      >
        <Terminal className="h-4 w-4 mr-2" />
        Show Debug Console
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[600px]">
      <Card className="p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Debug Console</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleVisibility}>
            Hide
          </Button>
        </div>

        <ScrollArea className="h-[300px] rounded-md border">
          <div className="p-4 space-y-2">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`text-sm font-mono ${
                  log.type === 'error' ? 'text-red-500 bg-red-950/20' : 
                  log.type === 'success' ? 'text-green-500 bg-green-950/20' : 
                  'text-foreground bg-muted/20'
                } rounded p-2 whitespace-pre-wrap break-words`}
              >
                <span className="opacity-50">[{log.timestamp}]</span>
                <span className="ml-2">
                  {log.message}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-muted-foreground text-center py-4">
                Waiting for events...
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default DebugPanel;