const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('🔍 Probando conexión a la base de datos...');
    
    // Intentar una consulta simple
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conexión exitosa:', result);
    
    // Verificar si hay usuarios en la base de datos
    const userCount = await prisma.usuario.count();
    console.log(`📊 Número de usuarios en la base de datos: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    
    if (error.code === 'P1017') {
      console.log('💡 Sugerencias para solucionar el error P1017:');
      console.log('1. Verifica que la DATABASE_URL sea correcta');
      console.log('2. Asegúrate de que la base de datos esté activa en Render.com');
      console.log('3. Verifica que no haya problemas de red');
      console.log('4. Intenta agregar parámetros de conexión: ?connection_limit=1&pool_timeout=20');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
