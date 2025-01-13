import { Request, Response, NextFunction } from "express";
import { subscriptionService } from "../services/subscription";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    subscription_tier: string;
  };
}

export function requireSubscription(tier: "basic" | "pro" | "enterprise") {
  return function(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ 
        error: "Authentication required",
        details: "Please login to access this feature"
      });
    }

    // Basic tier is always allowed
    if (tier === "basic") {
      return next();
    }

    // Check subscription tier
    const userTier = user.subscription_tier.toLowerCase();
    const tiers = ["basic", "pro", "enterprise"];
    const userTierIndex = tiers.indexOf(userTier);
    const requiredTierIndex = tiers.indexOf(tier);

    if (userTierIndex < requiredTierIndex) {
      return res.status(403).json({
        error: "Higher tier required",
        details: `This feature requires a ${tier} subscription or higher`
      });
    }

    next();
  };
}