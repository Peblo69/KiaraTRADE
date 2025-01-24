import { drizzle } from "drizzle-orm/postgres-js";
import postgres from 'postgres';

if (!import.meta.env.VITE_DATABASE_URL) {
  throw new Error("Database URL not found in environment variables");
}

const queryClient = postgres(import.meta.env.VITE_DATABASE_URL);
export const db = drizzle(queryClient);