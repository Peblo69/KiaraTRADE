import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http from 'http';

const app = express();
const port = Number(process.env.PORT || 5000);
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

    // Create new server instance
    server = http.createServer(app);

    // Register routes first
    registerRoutes(app);

    // Global error handler middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      const status = err instanceof Error ? 500 : err.status;
      const message = err.message || "Internal Server Error";
      log(`Error Handler: ${status} - ${message}`);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // Setup vite in development and after all other routes
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        return reject(new Error('Server was not properly initialized'));
      }

      server.listen(port, '0.0.0.0', () => {
        log('\n🚀 Server Status:');
        log(`📡 Internal: Running on 0.0.0.0:${port}`);
        log(`🌍 External: Mapped to port 80`);
        log(`⏰ Started at: ${new Date().toISOString()}`);
        log('\n✅ Server is ready to accept connections\n');
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
  if (server) {
    server.close(() => {
      log('Server gracefully shut down');
      process.exit(0);
    });
  }
});

// Handle interrupts
process.on('SIGINT', () => {
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