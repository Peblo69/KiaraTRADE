import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";

// In-memory data structure for candles
const tokenCandles: Record<string, Array<{
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>> = {};

interface Trade {
  tokenAddress: string;
  price: number;
  volume: number;
  timestamp: number;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrade
  httpServer.on('upgrade', (request, socket, head) => {
    // Skip vite HMR connections
    if (request.headers['sec-websocket-protocol'] === 'vite-hmr') {
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('Client connected to aggregator WebSocket');

    // Connect to PumpFun WebSocket
    const pumpFunWs = new WebSocket('wss://pumpportal.fun/api/data');

    pumpFunWs.on('open', () => {
      console.log('Connected to PumpFun WebSocket');
      // Subscribe to new token events
      pumpFunWs.send(JSON.stringify({
        method: "subscribeNewToken"
      }));
    });

    pumpFunWs.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.txType === 'create' || message.txType === 'trade') {
          const trade: Trade = {
            tokenAddress: message.mint,
            price: message.solAmount / (message.tokenAmount || message.initialBuy),
            volume: message.solAmount,
            timestamp: Date.now()
          };

          updateCandle(trade);

          // Broadcast the updated candle to all connected clients
          const candle = getCurrentCandle(trade.tokenAddress);
          if (candle) {
            broadcast(wss, {
              type: 'candle_update',
              tokenAddress: trade.tokenAddress,
              candle
            });
          }
        }
      } catch (error) {
        console.error('Error processing PumpFun message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from aggregator WebSocket');
      pumpFunWs.close();
    });
  });

  // REST endpoint for historical candles
  app.get('/api/tokens/:address/candles', (req, res) => {
    const { address } = req.params;
    const candles = tokenCandles[address] || [];
    res.json(candles);
  });

  return httpServer;
}

// Helper functions for candle management
function updateCandle(trade: Trade) {
  const timeframe = 5 * 60 * 1000; // 5-minute candles
  const candleTimestamp = Math.floor(trade.timestamp / timeframe) * timeframe;

  if (!tokenCandles[trade.tokenAddress]) {
    tokenCandles[trade.tokenAddress] = [];
  }

  const candles = tokenCandles[trade.tokenAddress];
  let currentCandle = candles[candles.length - 1];

  if (!currentCandle || currentCandle.timestamp !== candleTimestamp) {
    // Create new candle
    currentCandle = {
      timestamp: candleTimestamp,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: trade.volume
    };
    candles.push(currentCandle);
  } else {
    // Update existing candle
    currentCandle.high = Math.max(currentCandle.high, trade.price);
    currentCandle.low = Math.min(currentCandle.low, trade.price);
    currentCandle.close = trade.price;
    currentCandle.volume += trade.volume;
  }

  // Keep only last 24 hours of candles
  const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
  tokenCandles[trade.tokenAddress] = candles.filter(c => c.timestamp > cutoffTime);
}

function getCurrentCandle(tokenAddress: string) {
  const candles = tokenCandles[tokenAddress];
  return candles ? candles[candles.length - 1] : null;
}

function broadcast(wss: WebSocketServer, data: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}