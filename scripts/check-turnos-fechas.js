const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTurnosFechas() {
  try {
    console.log('🔍 Verificando fechas de turnos...\n');
    
    // Verificar algunos turnos para ver sus fechas
    const turnos = await prisma.turno.findMany({
      take: 5,
      select: {
        id: true,
        horaSalida: true,
        horaCreacion: true,
        fecha: true
      }
    });
    
    console.log('📅 Primeros 5 turnos:');
    turnos.forEach(t => {
      console.log(`ID: ${t.id}`);
      console.log(`  fecha: ${t.fecha}`);
      console.log(`  horaSalida: ${t.horaSalida}`);
      console.log(`  horaCreacion: ${t.horaCreacion}`);
      console.log('');
    });
    
    // Verificar el rango de fechas que estamos buscando
    const inicio = new Date('2025-08-04T00:00:00-05:00');
    const fin = new Date('2025-08-04T23:59:59-05:00');
    
    console.log(`🎯 Buscando turnos entre: ${inicio} y ${fin}`);
    
    const turnosEnRango = await prisma.turno.count({
      where: {
        horaSalida: {
          gte: inicio,
          lte: fin
        }
      }
    });
    
    console.log(`📊 Turnos encontrados en rango: ${turnosEnRango}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTurnosFechas(); 