import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.PGHOST || "",
    user: process.env.PGUSER || "",
    password: process.env.PGPASSWORD || "",
    database: process.env.PGDATABASE || "",
    port: Number(process.env.PGPORT) || 5432,
    ssl: true
  },
  strict: true,
  verbose: true,
});