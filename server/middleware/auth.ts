import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import session from "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    subscription_tier: string;
  };
  session: session.Session & Partial<session.SessionData>;
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check session
  if (!req.session || !req.session.userId) {
    return next();
  }

  try {
    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId)
    });

    if (user) {
      // Attach user to request
      req.user = {
        id: user.id,
        username: user.username,
        subscription_tier: user.subscription_tier || 'basic'
      };
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    next();
  }
}