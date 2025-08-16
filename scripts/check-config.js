const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkConfig() {
  try {
    console.log('🔍 Verificando configuración en la base de datos...');
    
    const config = await prisma.configuracion.findFirst();
    
    if (config) {
      console.log('✅ Configuración encontrada:', config);
    } else {
      console.log('❌ No hay configuración en la base de datos');
      console.log('📝 Creando configuración por defecto...');
      
      const newConfig = await prisma.configuracion.create({
        data: {
          tiempoMinimoSalida: 5,
          // Agregar otros campos según el esquema
        }
      });
      
      console.log('✅ Configuración creada:', newConfig);
    }
    
    // Verificar otras tablas importantes
    console.log('\n🔍 Verificando otras tablas...');
    
    const automoviles = await prisma.automovil.findMany();
    console.log(`🚗 Automóviles: ${automoviles.length}`);
    
    const conductores = await prisma.conductor.findMany();
    console.log(`👤 Conductores: ${conductores.length}`);
    
    const rutas = await prisma.ruta.findMany();
    console.log(`🛣️ Rutas: ${rutas.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfig(); 