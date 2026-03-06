import { PrismaClient } from "@prisma/client";

let _prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!_prisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Add it to Vercel environment variables.");
    }
    _prisma = new PrismaClient();
  }
  return _prisma;
}

/** Lazy Prisma client - only initializes when first used (avoids build-time errors when DATABASE_URL is not yet available) */
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
