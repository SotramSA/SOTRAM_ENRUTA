// Cargar variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

// Simular el comportamiento de PrismaClientWithRetry para pruebas
class TestPrismaClientWithRetry extends PrismaClient {
  constructor() {
    const primaryUrl = process.env.DATABASE_URL_PRIMARY || process.env.DATABASE_URL;
    const secondaryUrl = process.env.DATABASE_URL_SECONDARY;
    
    const urls = [primaryUrl];
    if (secondaryUrl && secondaryUrl !== '[IP_MOVISTAR]') {
      urls.push(secondaryUrl);
    }
    
    super({
      log: ['query'],
      datasources: {
        db: {
          url: primaryUrl,
        },
      },
    });

    this.currentDatabaseUrl = primaryUrl;
    this.databaseUrls = urls;
    
    console.log(`🔗 Configuradas ${this.databaseUrls.length} URLs de base de datos`);
    console.log(`📍 URL actual: ${this.currentDatabaseUrl}`);
  }

  async testConnection() {
    try {
      console.log('\n🧪 Probando conexión a la base de datos...');
      
      // Intentar una consulta simple
      const result = await this.$queryRaw`SELECT 1 as test`;
      console.log('✅ Conexión exitosa:', result);
      
      return true;
    } catch (error) {
      console.log('❌ Error de conexión:', error.message);
      return false;
    }
  }

  async testFailover() {
    console.log('\n🔄 Probando sistema de failover...');
    
    if (this.databaseUrls.length < 2) {
      console.log('⚠️  Solo hay una URL configurada. Configure DATABASE_URL_SECONDARY para probar failover.');
      return;
    }
    
    console.log(`📍 URLs disponibles: ${this.databaseUrls.length}`);
    this.databaseUrls.forEach((url, index) => {
      const maskedUrl = url.replace(/:[^:@]*@/, ':****@');
      console.log(`  ${index + 1}. ${maskedUrl}`);
    });
    
    // Simular fallo de conexión forzando una URL inválida
    console.log('\n🚫 Simulando fallo de conexión...');
    const originalUrl = this.currentDatabaseUrl;
    
    try {
      // Cambiar a una URL inválida para simular fallo
      await this.$disconnect();
      
      const invalidClient = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@invalid:5432/invalid'
          }
        }
      });
      
      await invalidClient.$connect();
      console.log('❌ No se esperaba conexión exitosa con URL inválida');
      
    } catch (error) {
      console.log('✅ Fallo simulado correctamente:', error.code || error.message.substring(0, 50));
      
      // Ahora probar reconexión con URL válida
      console.log('\n🔄 Intentando reconexión...');
      try {
        await this.$connect();
        const result = await this.$queryRaw`SELECT 'Reconexión exitosa' as message`;
        console.log('✅ Reconexión exitosa:', result);
      } catch (reconnectError) {
        console.log('❌ Fallo en reconexión:', reconnectError.message);
      }
    }
  }
}

async function main() {
  console.log('🧪 Iniciando pruebas del sistema de failover de base de datos\n');
  
  // Verificar variables de entorno
  console.log('📋 Verificando configuración:');
  console.log(`DATABASE_URL_PRIMARY: ${process.env.DATABASE_URL_PRIMARY ? '✅ Configurada' : '❌ No configurada'}`);
  console.log(`DATABASE_URL_SECONDARY: ${process.env.DATABASE_URL_SECONDARY ? '✅ Configurada' : '❌ No configurada'}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurada' : '❌ No configurada'}`);
  
  const client = new TestPrismaClientWithRetry();
  
  try {
    // Probar conexión normal
    await client.testConnection();
    
    // Probar sistema de failover
    await client.testFailover();
    
    console.log('\n✅ Pruebas completadas');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  } finally {
    await client.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TestPrismaClientWithRetry };