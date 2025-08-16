const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTiempoPromedioFinal() {
  try {
    console.log('🔍 Probando tiempo promedio con COALESCE...\n');
    
    const inicio = new Date('2025-08-04T00:00:00-05:00');
    const fin = new Date('2025-08-04T23:59:59-05:00');
    
    const tiempoPromedio = await prisma.$queryRaw`
      SELECT 
        COALESCE(AVG(EXTRACT(EPOCH FROM ("horaSalida" - "horaCreacion")) / 60), 0) as tiempoPromedioMinutos
      FROM "Turno" 
      WHERE "horaSalida" >= ${inicio} AND "horaSalida" <= ${fin}
      AND "horaSalida" > "horaCreacion"
    `;
    
    console.log('📊 Resultado de la consulta:');
    console.log(tiempoPromedio);
    
    const tiempoNum = Number(tiempoPromedio[0]?.tiempoPromedioMinutos || 0);
    console.log(`\n⏱️ Tiempo promedio convertido: ${tiempoNum} minutos`);
    
    // Verificar algunos turnos para ver la diferencia
    const turnos = await prisma.turno.findMany({
      take: 5,
      where: {
        horaSalida: {
          gte: inicio,
          lte: fin
        },
        horaSalida: {
          gt: prisma.turno.fields.horaCreacion
        }
      },
      select: {
        id: true,
        horaSalida: true,
        horaCreacion: true
      }
    });
    
    console.log('\n📅 Ejemplos de turnos con diferencia positiva:');
    turnos.forEach(t => {
      const diffMs = t.horaSalida.getTime() - t.horaCreacion.getTime();
      const diffMin = diffMs / (1000 * 60);
      console.log(`Turno ${t.id}: ${diffMin.toFixed(2)} minutos`);
    });
    
    // Contar cuántos turnos tienen horaSalida > horaCreacion
    const countTurnos = await prisma.turno.count({
      where: {
        horaSalida: {
          gte: inicio,
          lte: fin
        },
        horaSalida: {
          gt: prisma.turno.fields.horaCreacion
        }
      }
    });
    
    console.log(`\n📊 Total de turnos con horaSalida > horaCreacion: ${countTurnos}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTiempoPromedioFinal(); 