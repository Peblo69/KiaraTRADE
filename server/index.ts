import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { authenticateUser } from "./middleware/auth";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Generate a secure session secret if not provided
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// Session configuration with better error handling
const MemoryStoreSession = MemoryStore(session);
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
app.use(authenticateUser);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

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
        res.status(status).json({ error: message });
      }
    });

    // Setup vite in development and after all other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server with port fallback logic
    const tryPort = async (port: number): Promise<number> => {
      try {
        await new Promise((resolve, reject) => {
          server.listen(port, "0.0.0.0")
            .once('listening', () => {
              log(`Server running on port ${port}`);
              resolve(port);
            })
            .once('error', (err: any) => {
              if (err.code === 'EADDRINUSE') {
                log(`Port ${port} is in use, trying next port`);
                resolve(tryPort(port + 1));
              } else {
                reject(err);
              }
            });
        });
        return port;
      } catch (error) {
        throw error;
      }
    };

    const startingPort = parseInt(process.env.PORT || "3001", 10);
    await tryPort(startingPort);

    // Handle server shutdown gracefully
    process.on('SIGTERM', () => {
      log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Server startup error: ${errorMessage}`);
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});