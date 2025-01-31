import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "net";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

    const PORT = process.env.PORT || 3000;

    // Try to find an available port if the default one is in use
    const findAvailablePort = (startPort: number): Promise<number> => {
      return new Promise((resolve) => {
        const testServer = createServer();
        testServer.on('error', () => {
          resolve(findAvailablePort(startPort + 1));
        });
        testServer.on('listening', () => {
          testServer.close(() => resolve(startPort));
        });
        testServer.listen(startPort);
      });
    };

    const availablePort = await findAvailablePort(Number(PORT));
    log(`Found available port: ${availablePort}`);

    server.listen(availablePort, () => {
      log(`Server running on port ${availablePort}`);
    }).on('error', (error: any) => {
      log(`Failed to start server: ${error.message}`);
      process.exit(1);
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