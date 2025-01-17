import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { sendVerificationEmail } from "./services/email";
import session from "express-session";
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
          message: "Username, email, and password are required"
        });
      }

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username)
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Username already taken"
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
      res.status(500).json({
        message: "Registration failed. Please try again."
      });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          message: "Username and password are required"
        });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.username, username)
      });

      if (!user) {
        return res.status(400).json({
          message: "Invalid username or password"
        });
      }

      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          message: "Invalid username or password"
        });
      }

      if (!user.email_verified) {
        return res.status(400).json({
          message: "Please verify your email before logging in"
        });
      }

      // Set user session
      (req as any).session.userId = user.id;

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
      res.status(500).json({
        message: "Login failed. Please try again."
      });
    }
  });

  // Email verification endpoint
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          message: "Invalid verification token"
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
          message: "Invalid or expired verification token"
        });
      }

      res.json({
        message: "Email verified successfully",
        userId: user.id
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({
        message: "Email verification failed. Please try again."
      });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          message: "Logout failed"
        });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  return httpServer;
}