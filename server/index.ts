import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http from 'http';

const app = express();
const PORT = 5000; // Fixed port for the internal server
let server: http.Server | null = null;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function startServer() {
  try {
    // If server is already running, don't start again
    if (server?.listening) {
      log('⚠️ Server is already running');
      return;
    }

    server = registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`❌ Error Handler: ${status} - ${message}`);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    await new Promise<void>((resolve, reject) => {
      if (!server) {
        return reject(new Error('Server was not properly initialized'));
      }

      server.listen(PORT, '0.0.0.0', () => {
        log(`🚀 Server Status:`);
        log(`📡 Server running on port ${PORT}`);
        log(`⏰ Started at: ${new Date().toISOString()}`);
        resolve();
      }).on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          log(`❌ Port ${PORT} is already in use. Please close any other running instances.`);
          process.exit(1);
        }
        reject(error);
      });
    });

  } catch (error) {
    log(`❌ Server startup error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('📤 SIGTERM received. Starting graceful shutdown...');
  if (server) {
    server.close(() => {
      log('👋 Server gracefully shut down');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  log('📤 SIGINT received. Starting graceful shutdown...');
  if (server) {
    server.close(() => {
      log('👋 Server interrupted and shut down');
      process.exit(0);
    });
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

startServer().catch(error => {
  log(`❌ Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});