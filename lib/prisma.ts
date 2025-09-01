import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more: https://pris.ly/d/help/next-js-best-practices

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Logging de queries en desarrollo
if (process.env.NODE_ENV !== 'production') {
  // Los logs ya están configurados en el PrismaClient con log: ['query']
}

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;
