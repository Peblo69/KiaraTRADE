import { FC, useEffect, useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Terminal, Activity } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface LogMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'warn' | 'render';
}

interface PerformanceMetrics {
  renders: Record<string, number>;
  stateUpdates: number;
  queryUpdates: number;
}

export const DebugPanel: FC = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renders: {},
    stateUpdates: 0,
    queryUpdates: 0,
  });
  const metricsRef = useRef(metrics);

  useEffect(() => {
    // Override console methods to capture logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const formatValue = (value: any): string => {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value === 'object') {
        try {
          const stringified = JSON.stringify(value, null, 2);
          if (stringified.length > 500) {
            return stringified.substring(0, 500) + '...';
          }
          return stringified;
        } catch (e) {
          return String(value);
        }
      }
      return String(value);
    };

    const addLog = (type: LogMessage['type'], ...args: any[]) => {
      const formattedMessage = args
        .map(formatValue)
        .filter(Boolean)
        .join(' ');

      if (formattedMessage) {
        setLogs(prev => [
          ...prev,
          {
            timestamp: new Date().toLocaleTimeString(),
            message: formattedMessage,
            type
          }
        ].slice(-100)); // Keep last 100 logs
      }
    };

    // Track React Query cache updates
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      metricsRef.current = {
        ...metricsRef.current,
        queryUpdates: metricsRef.current.queryUpdates + 1
      };
      setMetrics(metricsRef.current);
      addLog('info', '[React Query] Cache updated');
    });

    // Override console methods
    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog('info', ...args);
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog('error', ...args);
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog('warn', ...args);
    };

    // Track component renders using a custom hook
    const trackRender = (componentName: string) => {
      metricsRef.current = {
        ...metricsRef.current,
        renders: {
          ...metricsRef.current.renders,
          [componentName]: (metricsRef.current.renders[componentName] || 0) + 1
        }
      };
      setMetrics(metricsRef.current);
      addLog('render', `[Render] ${componentName}`);
    };

    // Make trackRender available globally
    (window as any).__trackRender = trackRender;

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      delete (window as any).__trackRender;
      unsubscribe();
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

  const renderMetrics = () => (
    <div className="mb-4 grid grid-cols-2 gap-4">
      <Card className="p-2 bg-background/80">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">React Query Updates</span>
        </div>
        <span className="text-xl font-bold">{metrics.queryUpdates}</span>
      </Card>
      <Card className="p-2 bg-background/80">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium">Component Renders</span>
        </div>
        <div className="space-y-1">
          {Object.entries(metrics.renders).map(([component, count]) => (
            <div key={component} className="text-sm flex justify-between">
              <span className="text-muted-foreground">{component}:</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

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

        {renderMetrics()}

        <ScrollArea className="h-[300px] rounded-md border">
          <div className="p-4 space-y-2">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`text-sm font-mono ${
                  log.type === 'error' ? 'text-red-500 bg-red-950/20' : 
                  log.type === 'warn' ? 'text-yellow-500 bg-yellow-950/20' :
                  log.type === 'success' ? 'text-green-500 bg-green-950/20' :
                  log.type === 'render' ? 'text-blue-500 bg-blue-950/20' :
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