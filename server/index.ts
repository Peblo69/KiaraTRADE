import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http from 'http';

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server first
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function startServer() {
  try {
    // Register routes first
    registerRoutes(app, server);

    // Global error handler middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error Handler: ${status} - ${message}`);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // Setup vite in development and after all other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server on port 3000 with 0.0.0.0 binding
    await new Promise<void>((resolve) => {
      server.listen(port, '0.0.0.0', () => {
        log(`🚀 Server Status:`);
        log(`📡 Internal: Running on 0.0.0.0:${port}`);
        log(`🌍 External: Mapped to port 80`);
        log(`⏰ Started at: ${new Date().toISOString()}`);
        resolve();
      });
    });

  } catch (error) {
    log(`Server startup error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Graceful shutdown handler
process.on('SIGTERM', () => {
  server.close(() => {
    log('Server gracefully shut down');
    process.exit(0);
  });
});

// Handle interrupts
process.on('SIGINT', () => {
  server.close(() => {
    log('Server interrupted and shut down');
    process.exit(0);
  });
});

// Start the server
startServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});