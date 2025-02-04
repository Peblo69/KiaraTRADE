import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http from 'http';

const app = express();
const PORT = process.env.PORT || 4000; // Changed to use port 4000 instead

let server: http.Server | null = null;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function startServer() {
  try {
    // Close existing server if it exists
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close(() => {
          server = null;
          log('Closed existing server');
          resolve();
        });
      });
    }

    // Register routes first
    server = registerRoutes(app);

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

    // Start server on port 5000 with 0.0.0.0 binding
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        return reject(new Error('Server was not properly initialized'));
      }

      server.close(() => {
        log('Closed any existing port bindings');

        server?.listen(PORT, '0.0.0.0', () => {
          log(`🚀 Server Status:`);
          log(`📡 Running on 0.0.0.0:${PORT}`);
          log(`⏰ Started at: ${new Date().toISOString()}`);
          resolve();
        }).on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            log(`Port ${PORT} is already in use. Attempting to close existing connections...`);
            server = null;
          }
          reject(error);
        });
      });
    });

  } catch (error) {
    log(`Server startup error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  if (server) {
    server.close(() => {
      log('Server gracefully shut down');
      process.exit(0);
    });
  }
});

// Handle interrupts
process.on('SIGINT', async () => {
  if (server) {
    server.close(() => {
      log('Server interrupted and shut down');
      process.exit(0);
    });
  }
});

// Start the server
startServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});