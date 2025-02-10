import type { Express } from "express";

// Initialize routes
export function registerRoutes(app: Express): Express {
  // Basic health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  return app;
}