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

    // Try available ports starting from 5000
    const tryPort = async (startPort: number) => {
      for (let port = startPort; port < startPort + 10; port++) {
        try {
          await new Promise((resolve, reject) => {
            server.listen(port, "0.0.0.0", () => {
              log(`Server running on port ${port}`);
              resolve(port);
            }).on('error', (error: any) => {
              if (error.code === 'EADDRINUSE') {
                reject(new Error(`Port ${port} in use`));
              } else {
                reject(error);
              }
            });
          });
          return port;
        } catch (error) {
          if (port === startPort + 9) {
            log('No available ports found in range');
            process.exit(1);
          }
          continue;
        }
      }
    };

    // Try to start server beginning with port 5000
    await tryPort(5000);

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