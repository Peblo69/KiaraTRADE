import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { sendVerificationEmail } from "./email";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return hashedPasswordBuf.equals(suppliedPasswordBuf);
}

export async function registerUser(username: string, email: string, password: string) {
  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: (users, { or }) => or(
      eq(users.username, username),
      eq(users.email, email)
    ),
  });

  if (existingUser) {
    throw new Error("Username or email already exists");
  }

  // Generate verification token
  const verificationToken = randomBytes(32).toString("hex");
  const hashedPassword = await hashPassword(password);

  // Create new user
  const [user] = await db.insert(users).values({
    username,
    email,
    password: hashedPassword,
    verification_token: verificationToken,
    email_verified: false,
  }).returning();

  // Send verification email
  await sendVerificationEmail(email, verificationToken);

  return user;
}

export async function verifyEmail(token: string) {
  const [user] = await db
    .update(users)
    .set({ email_verified: true, verification_token: null })
    .where(eq(users.verification_token, token))
    .returning();

  return user;
}
