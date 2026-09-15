// Prisma Client Instance
// This file exports a singleton instance of the Prisma client

import { PrismaClient } from '@prisma/client';

// Create a single instance of PrismaClient
const prisma = new PrismaClient();

export default prisma;
