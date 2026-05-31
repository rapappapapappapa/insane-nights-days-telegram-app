const { PrismaClient } = require('@prisma/client');

/** Singleton partagé (évite plusieurs pools de connexion en dev / sous charge). */
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__insanePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__insanePrisma = prisma;
}

module.exports = prisma;
