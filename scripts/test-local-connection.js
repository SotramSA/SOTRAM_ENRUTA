const { PrismaClient } = require('@prisma/client');

async function testLocalConnection() {
  console.log('🔍 Probando conexión a base de datos local...');
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    // Intentar una consulta simple
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conexión exitosa:', result);
    
    // Verificar si hay usuarios en la base de datos
    const userCount = await prisma.usuario.count();
    console.log(`📊 Número de usuarios en la base de datos: ${userCount}`);
    
    // Verificar tablas principales
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('📋 Tablas disponibles:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.log('\n💡 Soluciones posibles:');
      console.log('1. Ejecuta el script de túnel SSH: .\\scripts\\start-ssh-tunnel.ps1');
      console.log('2. Verifica que el servidor PostgreSQL esté configurado para conexiones externas');
      console.log('3. Asegúrate de que las credenciales sean correctas');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testLocalConnection();
