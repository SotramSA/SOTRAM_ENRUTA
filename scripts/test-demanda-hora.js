const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDemandaHora() {
  try {
    console.log('🔍 Probando consulta de demanda por hora...\n');
    
    const inicio = new Date('2025-08-04T00:00:00-05:00');
    const fin = new Date('2025-08-04T23:59:59-05:00');
    
    console.log(`📅 Buscando entre: ${inicio} y ${fin}\n`);
    
    const demandaPorHora = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM "horaSalida") as hora,
        COUNT(*) as cantidad
      FROM "Turno" 
      WHERE "horaSalida" >= ${inicio} AND "horaSalida" <= ${fin}
      GROUP BY EXTRACT(HOUR FROM "horaSalida")
      ORDER BY hora
    `;
    
    console.log('📊 Resultado de la consulta:');
    console.log(demandaPorHora);
    
    console.log('\n📋 Datos procesados:');
    const demandaCompleta = Array.from({ length: 24 }, (_, i) => {
      const horaData = demandaPorHora.find(h => h.hora === i);
      return {
        hora: i,
        cantidad: horaData ? Number(horaData.cantidad || 0) : 0
      };
    });
    
    demandaCompleta.forEach(item => {
      if (item.cantidad > 0) {
        console.log(`  Hora ${item.hora}: ${item.cantidad} turnos`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDemandaHora(); 