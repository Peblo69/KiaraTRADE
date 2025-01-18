import { useState, useEffect } from 'react';

interface LogMessage {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export const DebugConsole = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  // Expose the addLog function globally
  useEffect(() => {
    (window as any).debugConsole = {
      log: (msg: string) => addLog(msg, 'info'),
      error: (msg: string) => addLog(msg, 'error'),
      success: (msg: string) => addLog(msg, 'success')
    };

    return () => {
      delete (window as any).debugConsole;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-black/90 border border-purple-500/30 rounded-lg shadow-lg">
      <div 
        className="flex items-center justify-between p-2 bg-purple-900/20 rounded-t-lg cursor-pointer"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <h3 className="text-purple-300 font-mono text-sm">Debug Console</h3>
        <button className="text-purple-300 hover:text-purple-100">
          {isMinimized ? '▼' : '▲'}
        </button>
      </div>
      
      {!isMinimized && (
        <div className="h-64 overflow-y-auto p-2 font-mono text-sm">
          {logs.map(log => (
            <div key={log.id} className="mb-1">
              <span className="text-gray-500">[{log.timestamp}]</span>{' '}
              <span className={
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' :
                'text-purple-300'
              }>
                {log.message}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-500 italic">No logs yet...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugConsole;
