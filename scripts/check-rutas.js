const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRutas() {
  try {
    console.log('🔍 Verificando rutas...');
    
    const rutas = await prisma.ruta.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    
    console.log('✅ Rutas encontradas:');
    rutas.forEach(ruta => {
      console.log(`  - ${ruta.nombre}:`);
      console.log(`    - Frecuencia actual: ${ruta.frecuenciaActual} minutos`);
      console.log(`    - Prioridad: ${ruta.prioridad}`);
      console.log(`    - Una vez al día: ${ruta.unaVezDia}`);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRutas(); 