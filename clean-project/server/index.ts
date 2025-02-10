import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http from 'http';

const app = express();
const port = Number(process.env.PORT || 5000);
let server: http.Server | null = null;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global error handler middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  log(`Error Handler: ${err.message}`);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: err.message 
    });
  }
});

async function startServer() {
  try {
    // Create new server instance
    server = http.createServer(app);

    // Register routes with the server instance
    registerRoutes(app, server);

    // Setup vite in development
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    server.listen(port, '0.0.0.0', () => {
      log('\n🚀 Server Status:');
      log(`📡 Internal: Running on 0.0.0.0:${port}`);
      log(`🌍 External: Mapped to port 3000`);
      log(`👤 User: ${process.env.REPL_OWNER || 'unknown'}`);
      log(`⏰ Started at: ${new Date().toISOString()}`);
      log('\n✅ Server is ready to accept connections\n');
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

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  if (server) {
    server.close(() => {
      log('Server gracefully shut down');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  if (server) {
    server.close(() => {
      log('Server interrupted and shut down');
      process.exit(0);
    });
  }
});