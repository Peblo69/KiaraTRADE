import { db } from "@db";
import { coinImages, coinMappings, eq } from "drizzle-orm";
import type { Express } from "express";
import { type Server } from "http";
import { wsManager } from './services/websocket';

// Constants
const DEBUG = true;

function debugLog(source: string, message: string, data?: any) {
  if (DEBUG) {
    console.log(`[${source}] ${message}`, data ? data : '');
  }
}

export function registerRoutes(app: Express, server: Server): void {
  debugLog('Server', `Initializing routes for user ${process.env.REPL_OWNER || 'unknown'}`);

  // Initialize WebSocket manager with server instance
  wsManager.initialize(server);

  // Basic health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      user: process.env.REPL_OWNER || 'unknown'
    });
  });

  // Token image endpoints
  app.get('/api/token-image/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol;
      console.log(`[Routes] Fetching image for token: ${symbol}`);

      // Get image from database
      const mappingResult = await db
        .select()
        .from(coinMappings)
        .where(eq(coinMappings.kucoin_symbol, symbol))
        .limit(1);

      if (!mappingResult.length) {
        return res.status(404).json({ error: 'Token not found' });
      }

      const imageResult = await db
        .select()
        .from(coinImages)
        .where(eq(coinImages.coingecko_id, mappingResult[0].coingecko_id))
        .limit(1);

      const imageUrl = imageResult.length ? imageResult[0].image_url : null;
      res.json({ imageUrl });

    } catch (error: any) {
      console.error('[Routes] Token image error:', error);
      res.status(500).json({
        error: 'Failed to fetch token image',
        details: error.message
      });
    }
  });

  // Error handling middleware
  app.use((err: Error, _req: any, res: any, next: any) => {
    console.error('Global error handler:', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: err.message 
      });
    }
    next(err);
  });

  // Process handling
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if ((error as any).code === 'EADDRINUSE') {
      console.log('⚠️ Port is busy, attempting restart...');
      process.exit(1); // Replit will automatically restart
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });
}