import { PrismaClient } from '@prisma/client';

class PrismaClientWithRetry extends PrismaClient {
  constructor() {
    super({
      log: ['query'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Los errores se manejan en el método executeWithRetry
  }

  // Método para ejecutar consultas con reintentos
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Si es un error de conexión, intentar reconectar
        if (error.code === 'P1017' || error.message?.includes('Server has closed the connection')) {
          console.log(`🔄 Intento ${attempt}/${maxRetries} falló, reintentando...`);
          
          if (attempt < maxRetries) {
            // Esperar antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        }
        
        // Si no es un error de conexión o se agotaron los intentos, lanzar el error
        throw error;
      }
    }
    
    throw lastError!;
  }
}

// Crear instancia global
declare global {
  var prismaWithRetry: PrismaClientWithRetry | undefined;
}

const prismaWithRetry = global.prismaWithRetry || new PrismaClientWithRetry();

if (process.env.NODE_ENV !== 'production') {
  global.prismaWithRetry = prismaWithRetry;
}

export default prismaWithRetry;
