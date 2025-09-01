import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDefaultConfig() {
  try {
    console.log('🔄 Creando configuración por defecto...');
    
    // Crear configuración por defecto
    const config = await prisma.configuracion.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        nombre: 'configuracion_general',
        valor: JSON.stringify({
          tiempoMinimoSalida: 5,
          tiempoMaximoTurno: 120,
          impresoraHabilitada: false,
          impresionDirecta: false,
          nombreImpresora: null
        }),
        activo: true,
        descripcion: 'Configuración general del sistema',
        fechaCreacion: new Date()
      }
    });
    
    console.log('✅ Configuración por defecto creada exitosamente!');
    console.log('📝 Configuración:');
    console.log('   ID: ' + config.id);
    console.log('   Nombre: ' + config.nombre);
    console.log('   Activo: ' + config.activo);
    
  } catch (error) {
    console.error('❌ Error creando configuración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultConfig();

