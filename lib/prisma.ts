import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient singleton instance
 * 
 * Este archivo exporta la instancia global de Prisma para usar en toda la aplicación.
 * 
 * IMPORTANTE:
 * - En desarrollo: Se cachea en global para evitar múltiples conexiones
 * - En producción: Se usa el pool de conexiones de PostgreSQL
 * - NO hacer $disconnect() en endpoints de API - eso cierra la conexión pool
 * - Los parámetros de pool deben estar en DATABASE_URL: ?connection_limit=10&pool_timeout=20
 */

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : undefined,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// En desarrollo, cachear la instancia global para evitar exhausting connections
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
