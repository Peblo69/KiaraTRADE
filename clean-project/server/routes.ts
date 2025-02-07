import type { Express } from "express";
import express from 'express';

// Initialize routes
export function registerRoutes(app: Express): Express {
  // Basic health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // Global error handler
  app.use((err: Error, _req: any, res: any, _next: any) => {
    console.error('Error:', err);
    res.status(500).json({
      error: err.message || 'Internal Server Error'
    });
  });

  return app;
}