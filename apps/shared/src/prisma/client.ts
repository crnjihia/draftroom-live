import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client shared across the monorepo.
 * The client will be instantiated once per process.
 */
export const prisma = new PrismaClient();
