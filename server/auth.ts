import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// extend express user object with our schema
declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "kiara-supremacy",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt:", { ...req.body, password: '[REDACTED]' });

      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        console.log("Validation failed:", result.error.issues);
        return res
          .status(400)
          .json({ message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") });
      }

      const { username, email, password } = result.data;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        console.log("Registration failed: Username exists:", username);
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create verification token
      const verificationToken = randomBytes(32).toString('hex');

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          verification_token: verificationToken,
          email_verified: false,
        })
        .returning();

      console.log("User created successfully:", { id: newUser.id, username: newUser.username });

      // Log the user in after registration
      req.login(newUser, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: { 
            id: newUser.id, 
            username: newUser.username,
            email: newUser.email,
            email_verified: newUser.email_verified
          },
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt:", { username: req.body.username });

    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      console.log("Login validation failed:", result.error.issues);
      return res
        .status(400)
        .json({ message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") });
    }

    const cb = (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      if (!user) {
        console.log("Login failed:", info.message);
        return res.status(400).json({ message: info.message ?? "Login failed" });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return next(err);
        }

        console.log("Login successful:", { id: user.id, username: user.username });
        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            email_verified: user.email_verified
          },
        });
      });
    };
    passport.authenticate("local", cb)(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }

      console.log("Logout successful:", { username });
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as Express.User;
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: user.email_verified
      });
    }

    res.status(401).json({ message: "Not logged in" });
  });
}