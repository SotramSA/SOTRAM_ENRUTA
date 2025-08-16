const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPrinterConfig() {
  try {
    console.log('🔍 Verificando configuración de impresora...');
    
    const config = await prisma.configuracion.findFirst({
      where: { activo: true }
    });
    
    if (config) {
      console.log('✅ Configuración encontrada:');
      console.log('  - ID:', config.id);
      console.log('  - Impresora habilitada:', config.impresoraHabilitada);
      console.log('  - Impresión directa:', config.impresionDirecta);
      console.log('  - Nombre impresora:', config.nombreImpresora);
      console.log('  - Frecuencia automática:', config.frecuenciaAutomatica);
      console.log('  - Tiempo mínimo salida:', config.tiempoMinimoSalida);
      console.log('  - Tiempo máximo turno:', config.tiempoMaximoTurno);
    } else {
      console.log('❌ No se encontró configuración activa');
    }
    
    // Verificar turnos recientes
    console.log('\n🔍 Verificando turnos recientes...');
    const turnos = await prisma.turno.findMany({
      take: 5,
      orderBy: { id: 'desc' },
      include: {
        usuario: true,
        conductor: true,
        movil: true,
        ruta: true
      }
    });
    
    if (turnos.length > 0) {
      console.log('✅ Turnos encontrados:');
      turnos.forEach(turno => {
        console.log(`  - Turno ${turno.id}:`);
        console.log(`    * Móvil: ${turno.movil.movil}`);
        console.log(`    * Conductor: ${turno.conductor.nombre}`);
        console.log(`    * Ruta: ${turno.ruta?.nombre || 'N/A'}`);
        console.log(`    * Usuario: ${turno.usuario?.nombre || 'N/A'}`);
        console.log(`    * Hora salida: ${turno.horaSalida}`);
      });
    } else {
      console.log('❌ No se encontraron turnos');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrinterConfig(); 