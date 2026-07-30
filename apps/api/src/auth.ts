import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Db } from "./db";

export function createAuth(db: Db) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    emailAndPassword: { enabled: true },
    secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-secret-not-for-production",
    // Previews get a fresh URL per deploy, so fall back to Vercel's injected
    // VERCEL_URL; production pins BETTER_AUTH_URL to the stable alias.
    baseURL:
      process.env.BETTER_AUTH_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
    basePath: "/api/auth",
    trustedOrigins: ["http://localhost:5180"],
  });
}

export type Auth = ReturnType<typeof createAuth>;
