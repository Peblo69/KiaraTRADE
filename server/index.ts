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
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const stringifiedJson = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${stringifiedJson.length > 80 ? stringifiedJson.slice(0, 79) + "…" : stringifiedJson}`;
      }
      log(logLine);
    }
  });

  next();
});

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  log(`Uncaught Exception: ${error.message}`);
  if (process.env.NODE_ENV === 'development') {
    log(error.stack || 'No stack trace available');
  }
});

process.on('unhandledRejection', (reason: any) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  log(`Unhandled Rejection: ${errorMessage}`);
  if (process.env.NODE_ENV === 'development' && reason instanceof Error) {
    log(reason.stack || 'No stack trace available');
  }
});

// Initialize server and handle startup errors
async function startServer() {
  try {
    // Check required environment variables
    const requiredEnvVars = ['DATABASE_URL', 'OPENAI_API_KEY'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Register routes first
    const server = registerRoutes(app);

    // Global error handler middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      const details = process.env.NODE_ENV === 'development' ? err.stack : undefined;

      log(`Error Handler: ${status} - ${message}`);
      if (details) {
        log(`Stack Trace: ${details}`);
      }

      if (!res.headersSent) {
        res.status(status).json({ error: message, details });
      }
    });

    // Setup vite in development and after all other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      log(`Server running on port ${PORT}`);
    });

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
    if (error instanceof Error && error.stack) {
      log(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Start the server
startServer().catch(error => {
  log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});