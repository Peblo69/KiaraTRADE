import { z } from "zod";

export const discussionSchema = z.object({
  id: z.string().optional(),
  user_id: z.string(),
  token_address: z.string(),
  content: z.string().min(1, "Content is required"),
  upvotes: z.number().default(0),
  downvotes: z.number().default(0),
  createdAt: z.string().optional(),
});

export type Discussion = z.infer<typeof discussionSchema>;

export interface SocialMetrics {
  discussionCount: number;
  totalVotes: number;
  sentiment: number; // -1 to 1
  watchlistCount: number;
}

export interface TokenSocialData {
  discussions: Discussion[];
  metrics: SocialMetrics;
}
