import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http from 'http';

const app = express();
const port = process.env.PORT || 3000;
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

    // Start server on port 3000 with 0.0.0.0 binding
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        return reject(new Error('Server was not properly initialized'));
      }

      const startServer = () => {
        server!.listen(port, '0.0.0.0', () => {
          log(`🚀 Server Status:`);
          log(`📡 Internal: Running on 0.0.0.0:${port}`);
          log(`🌍 External: Mapped to port 80`);
          log(`⏰ Started at: ${new Date().toISOString()}`);
          resolve();
        }).on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            log(`Port ${port} is already in use, attempting to close existing connections...`);
            require('child_process').exec(`lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (err: any) => {
              if (err) {
                log(`Failed to release port ${port}. Please manually stop any processes using this port.`);
                process.exit(1);
              } else {
                log(`Successfully released port ${port}, restarting server...`);
                setTimeout(startServer, 1000);
              }
            });
          } else {
            log(`Server startup error: ${error.message}`);
            reject(error);
          }
        });
      };

      startServer();
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