import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let server: ReturnType<typeof createServer> | null = null;

const findAvailablePort = async (startPort: number, maxAttempts: number = 10): Promise<number> => {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    try {
      const testServer = createServer();
      await new Promise<void>((resolve, reject) => {
        testServer.once('error', (err: any) => {
          testServer.close();
          if (err.code === 'EADDRINUSE') {
            resolve();
          } else {
            reject(err);
          }
        });
        testServer.once('listening', () => {
          testServer.close(() => resolve());
        });
        testServer.listen(port, '0.0.0.0');
      });
      return port;
    } catch (err) {
      log(`Port ${port} is not available: ${err}`);
      continue;
    }
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
};

async function startServer() {
  try {
    // Cleanup any existing server
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close(() => resolve());
      });
      server = null;
    }

    // Find an available port first
    const port = await findAvailablePort(3000);
    log(`[Server] Found available port: ${port}`);
    log(`[Server] Initializing server for user ${process.env.REPL_OWNER || 'unknown'}`);

    // Create server instance
    server = createServer(app);

    // Register routes first
    registerRoutes(app);

    // Global error handler middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`[Error Handler] ${status} - ${message}`);
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

    // Start the server on the available port
    server.listen(port, '0.0.0.0', () => {
      log(`\n🚀 Server Status:
📡 Internal: Running on 0.0.0.0:${port}
🌍 External: Mapped to port 3000
👤 User: ${process.env.REPL_OWNER || 'unknown'}
⏰ Started at: ${new Date().toISOString()}

✅ Server is ready to accept connections\n`);
    });

    // Handle server shutdown
    const cleanup = () => {
      log('\n🛑 Shutting down server...');
      server?.close(() => {
        log('✅ Server shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

  } catch (error) {
    log(`[Server] Startup error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

// Export for testing
export { app };