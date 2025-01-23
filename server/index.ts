// client/src/lib/db/index.ts

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool for better performance
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Export database instance with schema
export const db = drizzle(pool, { schema });
