import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function startServer() {
  try {
    // Create HTTP server instance first
    const server = createServer(app);

    // Register routes and middleware before WebSocket setup
    const routes = registerRoutes();
    app.use('/', routes);

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

    // Handle WebSocket upgrade before starting server
    server.on('upgrade', (request, socket, head) => {
      // Ignore vite HMR requests
      const protocol = request.headers['sec-websocket-protocol'];
      if (protocol === 'vite-hmr') return;

      // Handle your WebSocket upgrades here
      socket.destroy();
    });

    // Start listening
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      log(`Server running on port ${PORT}`);
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