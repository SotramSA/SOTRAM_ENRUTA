const { PrismaClient } = require('@prisma/client');

async function testRemoteConnection() {
  console.log('🔍 Probando conexión remota a la base de datos...');
  console.log('📍 Servidor: 190.159.9.80:5432');
  console.log('🗄️  Base de datos: db_enruta');
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    // Probar conexión básica
    console.log('\n📡 Probando conectividad...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Conexión exitosa:', result);
    
    // Verificar usuarios
    console.log('\n👥 Verificando usuarios...');
    const userCount = await prisma.usuario.count();
    console.log(`📊 Número de usuarios: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.usuario.findMany({
        select: {
          id: true,
          usuario: true,
          nombre: true,
          activo: true
        }
      });
      
      console.log('📋 Usuarios en la base de datos:');
      users.forEach(user => {
        console.log(`   - ${user.usuario} (${user.nombre}) - ${user.activo ? 'Activo' : 'Inactivo'}`);
      });
    }
    
    // Verificar tablas principales
    console.log('\n📋 Verificando tablas...');
    const tables = await prisma.$queryRaw`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log('📊 Tablas disponibles:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name} (${table.table_type})`);
    });
    
    // Probar consulta de conductores
    console.log('\n🚗 Verificando conductores...');
    const conductorCount = await prisma.conductor.count();
    console.log(`📊 Número de conductores: ${conductorCount}`);
    
    // Probar consulta de automóviles
    console.log('\n🚙 Verificando automóviles...');
    const automovilCount = await prisma.automovil.count();
    console.log(`📊 Número de automóviles: ${automovilCount}`);
    
    // Probar consulta de rutas
    console.log('\n🛣️  Verificando rutas...');
    const rutaCount = await prisma.ruta.count();
    console.log(`📊 Número de rutas: ${rutaCount}`);
    
    console.log('\n🎉 ¡Prueba de conexión remota completada exitosamente!');
    console.log('✅ La base de datos está accesible desde dispositivos remotos');
    
  } catch (error) {
    console.error('❌ Error en la conexión remota:', error.message);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.log('\n💡 Posibles soluciones:');
      console.log('1. Verifica que PostgreSQL esté configurado para conexiones externas');
      console.log('2. Verifica que el firewall permita conexiones al puerto 5432');
      console.log('3. Verifica que la IP del servidor sea correcta');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testRemoteConnection();
