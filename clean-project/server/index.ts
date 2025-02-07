import express, { type Express, Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "../../server/vite.ts";
import http from 'http';

const app = express();
const port = process.env.PORT || 5000;
let server: http.Server | null = null;
let retries = 0;
const maxRetries = 3;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function startServer(port: number) {
  try {
    server = app.listen(port, '0.0.0.0', () => {
      console.log('\n🚀 Server Status:');
      console.log(`📡 Internal: Running on 0.0.0.0:${port}`);
      console.log(`🌍 External: Mapped to port 3000`);
      console.log(`👤 User: ${process.env.REPL_OWNER || 'unknown'}`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      console.log('\n✅ Server is ready to accept connections\n');
    });
    // Register routes after server is successfully started.
    registerRoutes(app);

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
    if (process.env.NODE_ENV === "development") {
      setupVite(app, server);
    } else {
      serveStatic(app);
    }

  } catch (error) {
    if (retries < maxRetries) {
      retries++;
      console.log(`Retrying on port ${port + retries}...`);
      startServer(port + retries);
    } else {
      console.error('Failed to start server after multiple retries');
      process.exit(1);
    }
  }
}


// Graceful shutdown handler
process.on('SIGTERM', async () => {
  if (server) {
    server.close(() => {
      log('Server gracefully shut down');
      process.exit(0);
    });
  }
});

// Handle interrupts
process.on('SIGINT', async () => {
  if (server) {
    server.close(() => {
      log('Server interrupted and shut down');
      process.exit(0);
    });
  }
});

// Start the server
startServer(port).catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});