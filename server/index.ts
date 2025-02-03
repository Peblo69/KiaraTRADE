import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const findAvailablePort = async (startPort: number, maxAttempts: number = 10): Promise<number> => {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    try {
      const server = createServer();
      await new Promise((resolve, reject) => {
        server.once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            server.close();
            resolve(false);
          } else {
            reject(err);
          }
        });
        server.once('listening', () => {
          server.close();
          resolve(true);
        });
        server.listen(port, '0.0.0.0');
      });
      return port;
    } catch (err) {
      log(`Port ${port} is not available`);
      continue;
    }
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
};

async function startServer() {
  try {
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

    // Find an available port
    const port = await findAvailablePort(5000);
    log(`Found available port: ${port}`);

    // Setup vite in development and after all other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server on the available port
    server.listen(port, '0.0.0.0', () => {
      log(`Server started on port ${port}`);
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