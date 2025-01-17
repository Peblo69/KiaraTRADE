import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

if (!process.env.PGDATABASE || !process.env.PGHOST || !process.env.PGPORT || !process.env.PGUSER || !process.env.PGPASSWORD) {
  throw new Error("PostgreSQL environment variables are required");
}

// Configure the connection for Replit's PostgreSQL
const client = postgres({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 1,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  idle_timeout: 20,
  connect_timeout: 10
});

export const db = drizzle(client, { schema });