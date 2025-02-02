import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function startServer() {
  try {
    // Create HTTP server instance
    const server = createServer(app);

    // Register routes first
    const routes = registerRoutes();
    app.use(routes);

    // Setup vite in development and after all other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Global error handler middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error Handler: ${status} - ${message}`);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // ONLY use port 80 which maps to 3000 externally
    const PORT = 80;

    // Check if port is in use
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`Port ${PORT} is in use, shutting down...`);
        process.exit(1);
      }
    });

    server.listen(PORT, "0.0.0.0", () => {
      log(`
🚀 Server Status:
📡 Internal: Running on 0.0.0.0:${PORT}
🌍 External: Mapped to port 3000
👤 User: ${process.env.REPL_OWNER || 'unknown'}
⏰ Started at: ${new Date().toISOString()}

✅ Server is ready to accept connections
      `);
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