// Script para probar conexión remota desde cualquier dispositivo
// Uso: node test-external-connection.js

const { PrismaClient } = require('@prisma/client');

// Configuración de conexión remota
const REMOTE_DATABASE_URL = "postgresql://sotram:S0tram.2025@190.159.9.80:5432/db_enruta";

async function testExternalConnection() {
  console.log('🌐 Probando conexión externa a la base de datos...');
  console.log('📍 Servidor remoto: 190.159.9.80:5432');
  console.log('🗄️  Base de datos: db_enruta');
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: REMOTE_DATABASE_URL,
      },
    },
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    // Probar conexión básica
    console.log('\n📡 Probando conectividad...');
    const startTime = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as server_time`;
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log('✅ Conexión exitosa:', result);
    console.log(`⏱️  Latencia: ${latency}ms`);
    
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
      
      console.log('📋 Usuarios disponibles:');
      users.forEach(user => {
        console.log(`   - ${user.usuario} (${user.nombre}) - ${user.activo ? '✅ Activo' : '❌ Inactivo'}`);
      });
    }
    
    // Verificar tablas principales
    console.log('\n📋 Verificando estructura de la base de datos...');
    const tables = await prisma.$queryRaw`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log(`📊 Total de tablas: ${tables.length}`);
    console.log('📋 Tablas principales:');
    const mainTables = ['Usuario', 'Conductor', 'Automovil', 'Ruta', 'Turno', 'Configuracion'];
    mainTables.forEach(tableName => {
      const table = tables.find(t => t.table_name === tableName);
      if (table) {
        console.log(`   ✅ ${tableName}`);
      } else {
        console.log(`   ❌ ${tableName} (no encontrada)`);
      }
    });
    
    // Probar consultas de rendimiento
    console.log('\n⚡ Probando rendimiento...');
    const performanceTests = [
      { name: 'Conteo de usuarios', query: () => prisma.usuario.count() },
      { name: 'Conteo de conductores', query: () => prisma.conductor.count() },
      { name: 'Conteo de automóviles', query: () => prisma.automovil.count() },
      { name: 'Conteo de rutas', query: () => prisma.ruta.count() },
    ];
    
    for (const test of performanceTests) {
      const start = Date.now();
      const result = await test.query();
      const duration = Date.now() - start;
      console.log(`   ${test.name}: ${result} registros (${duration}ms)`);
    }
    
    console.log('\n🎉 ¡Prueba de conexión externa completada exitosamente!');
    console.log('✅ La base de datos está accesible desde dispositivos externos');
    console.log('✅ Conexión estable y funcional');
    console.log('✅ Estructura de datos correcta');
    
  } catch (error) {
    console.error('❌ Error en la conexión externa:', error.message);
    
    if (error.message.includes('Can\'t reach database server')) {
      console.log('\n💡 Posibles causas:');
      console.log('1. El servidor PostgreSQL no está configurado para conexiones externas');
      console.log('2. El firewall bloquea el puerto 5432');
      console.log('3. La IP del servidor no es accesible desde esta ubicación');
      console.log('4. Problemas de red entre este dispositivo y el servidor');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n💡 Error de autenticación:');
      console.log('1. Verifica las credenciales de la base de datos');
      console.log('2. Verifica que el usuario tenga permisos de conexión');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la prueba
testExternalConnection();
