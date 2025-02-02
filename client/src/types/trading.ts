import { z } from "zod";

export const tradeSchema = z.object({
  id: z.number(),
  mint: z.string(),
  timestamp: z.number(),
  tokenAmount: z.number(),
  priceInUsd: z.number(),
  side: z.enum(["buy", "sell"]),
  wallet: z.string(),
  created_at: z.date()
});

export const orderBookSchema = z.object({
  asks: z.array(z.tuple([z.number(), z.number()])),
  bids: z.array(z.tuple([z.number(), z.number()]))
});

export type Trade = z.infer<typeof tradeSchema>;
export type OrderBook = z.infer<typeof orderBookSchema>;
