const { PrismaClient } = require('@prisma/client');

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
  }

  async executeWithRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (error.code === 'P1017' || error.message?.includes('Server has closed the connection')) {
          console.log(`🔄 Intento ${attempt}/${maxRetries} falló, reintentando...`);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }
}

async function testConnection() {
  const prisma = new PrismaClientWithRetry();

  try {
    console.log('🔍 Probando conexión con reintentos...');
    
    const result = await prisma.executeWithRetry(async () => {
      return await prisma.$queryRaw`SELECT 1 as test`;
    });
    
    console.log('✅ Conexión exitosa:', result);
    
    const userCount = await prisma.executeWithRetry(async () => {
      return await prisma.usuario.count();
    });
    
    console.log(`📊 Número de usuarios: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Error después de reintentos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
