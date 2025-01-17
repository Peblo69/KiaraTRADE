import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Configure the connection for Replit's PostgreSQL
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: true,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
