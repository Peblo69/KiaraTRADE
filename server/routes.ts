import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, insertUserSchema } from "@db/schema";
import { eq } from "drizzle-orm";
import session from "express-session";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { sendVerificationEmail } from "./services/email";
import { generateAIResponse } from "./services/ai";
import { cryptoService } from "./services/crypto";
import { log } from "./vite";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return hashedPasswordBuf.equals(suppliedPasswordBuf);
}

interface AuthenticatedRequest extends Request {
  session: {
    userId?: number;
  } & session.Session;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "kiara-super-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ 
          error: "Missing required fields",
          details: "Username, email, and password are required" 
        });
      }

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser) {
        return res.status(400).json({ 
          error: "User already exists",
          details: "Username is already taken" 
        });
      }

      // Generate verification token and hash password
      const verificationToken = randomBytes(32).toString("hex");
      const hashedPassword = await hashPassword(password);

      // Create new user
      const [user] = await db.insert(users).values({
        username,
        email,
        password: hashedPassword,
        verification_token: verificationToken,
        email_verified: false,
      }).returning();

      // Send verification email
      await sendVerificationEmail(email, verificationToken);

      res.status(201).json({ 
        message: "Registration successful. Please check your email for verification.",
        userId: user.id 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ 
        error: "Registration failed",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          error: "Missing credentials",
          details: "Username and password are required"
        });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (!user) {
        return res.status(400).json({
          error: "Invalid credentials",
          details: "Username or password is incorrect"
        });
      }

      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          error: "Invalid credentials",
          details: "Username or password is incorrect"
        });
      }

      if (!user.email_verified) {
        return res.status(400).json({
          error: "Email not verified",
          details: "Please verify your email before logging in"
        });
      }

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({
        error: "Login failed",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    (req as AuthenticatedRequest).session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          error: "Logout failed",
          details: "Failed to destroy session"
        });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Email verification endpoint
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ 
          error: "Invalid verification token",
          details: "A valid verification token is required"
        });
      }

      const [user] = await db
        .update(users)
        .set({ 
          email_verified: true,
          verification_token: null
        })
        .where(eq(users.verification_token, token))
        .returning();

      if (!user) {
        return res.status(400).json({ 
          error: "Verification failed",
          details: "Invalid or expired verification token"
        });
      }

      res.json({ 
        message: "Email verified successfully",
        userId: user.id 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Verification error: ${errorMessage}`);
      res.status(400).json({ 
        error: "Verification failed",
        details: errorMessage
      });
    }
  });

  // Market overview endpoint
  app.get("/api/market/overview", async (_req, res) => {
    try {
      const marketData = await cryptoService.getMarketOverview();
      res.json(marketData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Market overview error: ${errorMessage}`);
      res.status(500).json({ 
        error: "Failed to fetch market overview",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ 
          error: "Message is required",
          details: "Please provide a message to process"
        });
      }

      const response = await generateAIResponse(message, history);
      res.json({ response });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Chat error: ${errorMessage}`);
      res.status(500).json({ 
        error: "Failed to process chat message",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    try {
      const cacheStatus = cryptoService.getCacheStatus();
      res.json({ 
        status: "ok",
        openai_configured: !!process.env.OPENAI_API_KEY,
        crypto_service: cacheStatus
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Health check error: ${errorMessage}`);
      res.status(500).json({ status: "error", message: errorMessage });
    }
  });

  return httpServer;
}