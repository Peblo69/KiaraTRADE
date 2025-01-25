import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import type { Express } from 'express';
import http from 'http';
import { startImageWorker } from "./image-worker";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize server and handle startup errors
async function startServer() {
  try {
    // Start the image worker before setting up routes
    try {
      await startImageWorker();
      console.log('Image worker initialized successfully');
    } catch (error) {
      console.log(`Warning: Image worker failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Register routes first
    const server = registerRoutes(app);

    // Global error handler middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.log(`Error Handler: ${status} - ${message}`);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // Start server on port 5000
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    }).on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. Please ensure no other servers are running.`);
        process.exit(1);
      } else {
        console.log(`Failed to start server: ${error.message}`);
        process.exit(1);
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.log(`Server startup error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  console.log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});