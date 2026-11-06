const { PrismaClient } = require('@prisma/client');

/** Singleton partagé (évite plusieurs pools de connexion en dev / sous charge). */
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__noxPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__noxPrisma = prisma;
}

module.exports = prisma;
