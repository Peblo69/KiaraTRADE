import type { Express } from "express";
import { createServer, type Server } from "http";
import { wsManager } from './services/websocket';
import { WebSocket } from 'ws';
import { generateAIResponse } from './services/ai';
import axios from 'axios';

// Cache for CoinGecko data
let globalMetricsCache = {
  data: null,
  timestamp: 0
};
const CACHE_DURATION = 30000; // 30 seconds cache

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize WebSocket manager
  wsManager.initialize(httpServer);

  // Global metrics endpoint
  app.get('/api/global-metrics', async (req, res) => {
    try {
      // Check cache
      const now = Date.now();
      if (globalMetricsCache.data && (now - globalMetricsCache.timestamp) < CACHE_DURATION) {
        return res.json(globalMetricsCache.data);
      }

      const response = await axios.get('https://api.coingecko.com/api/v3/global');

      // Cache the response
      globalMetricsCache = {
        data: response.data,
        timestamp: now
      };

      res.json(response.data);
    } catch (error: any) {
      console.error('Global metrics error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch global metrics' });
    }
  });

  // Chat endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, sessionId } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get or initialize chat history for this session
      if (!chatHistory[sessionId]) {
        chatHistory[sessionId] = [];
      }

      // Generate response using our AI service
      const response = await generateAIResponse(message, chatHistory[sessionId]);

      // Update chat history
      chatHistory[sessionId].push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );

      // Keep only last 10 messages to prevent context from growing too large
      if (chatHistory[sessionId].length > 20) {
        chatHistory[sessionId] = chatHistory[sessionId].slice(-20);
      }

      res.json({ response });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message || 'Failed to process chat request' });
    }
  });

  return httpServer;
}

interface TokenData {
  name: string;
  symbol: string;
  marketCap: number;
  marketCapSol: number;
  liquidityAdded: boolean;
  holders: number;
  volume24h: number;
  address: string;
  price: number;
  imageUrl?: string;
}

// In-memory data structure for chat history
const chatHistory: Record<string, any[]> = {};