import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "net";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Function to check if a port is available
async function findAvailablePort(startPort: number): Promise<number> {
  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          server.once('close', () => resolve(true));
          server.close();
        })
        .listen(port, '0.0.0.0');
    });
  };

  // Try ports sequentially until we find an available one
  for (let port = startPort; port < startPort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Initialize server and handle startup errors
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

    // Setup vite in development and after all other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Find an available port starting from 5000
    const PORT = await findAvailablePort(5000);

    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
    }).on('error', (error: any) => {
      log(`Failed to start server: ${error.message}`);
      process.exit(1);
    });

  } catch (error) {
    log(`Server startup error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Add graceful shutdown handling
process.on('SIGTERM', () => {
  log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});