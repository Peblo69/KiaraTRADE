import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import http from 'http';

const app = express();
const port = 3001;
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
          console.log('Closed existing server');
          resolve();
        });
      });
    }

    // Register routes
    server = registerRoutes(app);

    // Global error handler middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error(`Error Handler: ${status} - ${message}`);
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // Start server
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        return reject(new Error('Server was not properly initialized'));
      }

      server.close(() => {
        console.log('Closed any existing port bindings');

        server?.listen(port, '0.0.0.0', () => {
          console.log(`🚀 Server Status:`);
          console.log(`📡 Internal: Running on 0.0.0.0:${port}`);
          console.log(`🌍 External: Mapped to port 3000`);
          console.log(`⏰ Started at: ${new Date().toISOString()}`);
          resolve();
        }).on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`Port ${port} is already in use. Attempting to close existing connections...`);
            server = null;
          }
          reject(error);
        });
      });
    });
  } catch (error) {
    console.error(`Server startup error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  if (server) {
    server.close(() => {
      console.log('Server gracefully shut down');
      process.exit(0);
    });
  }
});

// Handle interrupts
process.on('SIGINT', async () => {
  if (server) {
    server.close(() => {
      console.log('Server interrupted and shut down');
      process.exit(0);
    });
  }
});

// Start the server
startServer().catch(error => {
  console.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});