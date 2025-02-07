import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import http from 'http';

const app = express();
const port = 5000;
let server: http.Server | null = null;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Function to try binding to port
const tryBind = (retries = 5) => {
  return new Promise<void>((resolve, reject) => {
    if (retries === 0) {
      return reject(new Error('Max retries reached'));
    }

    server?.close();
    server = registerRoutes(app);
    
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} in use, retrying...`);
        setTimeout(() => {
          tryBind(retries - 1).then(resolve).catch(reject);
        }, 1000);
      } else {
        reject(err);
      }
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port}`);
      resolve();
    });
  });
};

// Start server with retries
tryBind().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});


// Global error handler middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`Error Handler: ${status} - ${message}`); //using console.error for better error logging
  if (!res.headersSent) {
    res.status(status).json({ message });
  }
});


// Start server on port 5000 with 0.0.0.0 binding
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
});

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