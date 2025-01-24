import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
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
      log('Image worker initialized successfully');
    } catch (error) {
      log(`Warning: Image worker failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
      // Continue server startup even if worker fails
    }

    // Register routes first
    const server = registerRoutes(app);

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

    // Try specific ports in order
    const ports = [3000, 3001, 5000, 5001, 8000];
    let serverStarted = false;

    for (const port of ports) {
      try {
        await new Promise((resolve, reject) => {
          server.listen(port, "0.0.0.0")
            .once('listening', () => {
              log(`Server running on port ${port}`);
              serverStarted = true;
              resolve(port);
            })
            .once('error', (err) => {
              if (err.code === 'EADDRINUSE') {
                log(`Port ${port} is in use, trying next port...`);
                resolve(null);
              } else {
                reject(err);
              }
            });
        });

        if (serverStarted) break;
      } catch (error) {
        log(`Error on port ${port}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!serverStarted) {
      log('Failed to start server on any port');
      process.exit(1);
    }

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    log(`Server startup error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});