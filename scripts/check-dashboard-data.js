const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDashboardData() {
  try {
    console.log('🔍 Verificando datos del dashboard...\n');

    // 1. Verificar si hay turnos en la base de datos
    const totalTurnos = await prisma.turno.count();
    console.log(`📊 Total de turnos en la base de datos: ${totalTurnos}`);

    if (totalTurnos === 0) {
      console.log('❌ No hay turnos en la base de datos');
      return;
    }

    // 2. Verificar turnos por fecha
    const turnosPorFecha = await prisma.turno.groupBy({
      by: ['fecha'],
      _count: {
        id: true
      },
      orderBy: {
        fecha: 'desc'
      },
      take: 10
    });

    console.log('\n📅 Turnos por fecha (últimos 10 días):');
    turnosPorFecha.forEach(t => {
      console.log(`  ${t.fecha.toISOString().split('T')[0]}: ${t._count.id} turnos`);
    });

    // 3. Verificar turnos para la fecha específica del dashboard (2025-08-04)
    const fechaEspecifica = new Date('2025-08-04T00:00:00-05:00');
    const finFecha = new Date('2025-08-04T23:59:59-05:00');
    
    const turnosFechaEspecifica = await prisma.turno.findMany({
      where: {
        horaCreacion: {
          gte: fechaEspecifica,
          lte: finFecha
        }
      },
      include: {
        movil: true,
        conductor: true,
        ruta: true
      }
    });

    console.log(`\n🎯 Turnos para 2025-08-04: ${turnosFechaEspecifica.length}`);
    
    if (turnosFechaEspecifica.length > 0) {
      console.log('Detalles de los turnos:');
      turnosFechaEspecifica.forEach(t => {
        console.log(`  - Móvil: ${t.movil.movil}, Conductor: ${t.conductor.nombre}, Ruta: ${t.ruta?.nombre || 'N/A'}, Estado: ${t.estado}`);
      });
    }

    // 4. Verificar demanda por hora para la fecha específica
    const demandaPorHora = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM "horaCreacion") as hora,
        COUNT(*) as cantidad
      FROM "Turno" 
      WHERE "horaCreacion" >= ${fechaEspecifica} AND "horaCreacion" <= ${finFecha}
      GROUP BY EXTRACT(HOUR FROM "horaCreacion")
      ORDER BY hora
    `;

    console.log('\n⏰ Demanda por hora para 2025-08-04:');
    console.log(demandaPorHora);

    // 5. Verificar tiempo promedio
    const tiempoPromedio = await prisma.$queryRaw`
      SELECT 
        AVG(EXTRACT(EPOCH FROM ("horaSalida" - "horaCreacion")) / 60) as tiempoPromedioMinutos
      FROM "Turno" 
      WHERE "horaCreacion" >= ${fechaEspecifica} AND "horaCreacion" <= ${finFecha}
      AND "horaSalida" > "horaCreacion"
    `;

    console.log('\n⏱️ Tiempo promedio de turno:');
    console.log(tiempoPromedio);

    // 6. Verificar automóviles activos
    const automovilesActivos = await prisma.$queryRaw`
      SELECT 
        a.id,
        a.movil,
        a.placa,
        COUNT(t.id) as turnosAsignados
      FROM "Automovil" a
      INNER JOIN "Turno" t ON a.id = t."movilId" 
        AND t."horaCreacion" >= ${fechaEspecifica} 
        AND t."horaCreacion" <= ${finFecha}
      WHERE a.activo = true
      GROUP BY a.id, a.movil, a.placa
      ORDER BY turnosAsignados DESC
      LIMIT 10
    `;

    console.log('\n🚗 Automóviles más activos:');
    console.log(automovilesActivos);

    // 7. Verificar conductores activos
    const conductoresActivos = await prisma.$queryRaw`
      SELECT 
        c.id,
        c.nombre,
        c.cedula,
        COUNT(t.id) as turnosAsignados
      FROM "Conductor" c
      INNER JOIN "Turno" t ON c.id = t."conductorId" 
        AND t."horaCreacion" >= ${fechaEspecifica} 
        AND t."horaCreacion" <= ${finFecha}
      WHERE c.activo = true
      GROUP BY c.id, c.nombre, c.cedula
      ORDER BY turnosAsignados DESC
      LIMIT 10
    `;

    console.log('\n👤 Conductores más activos:');
    console.log(conductoresActivos);

    // 8. Verificar métricas generales
    const metricasGenerales = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalTurnos,
        COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END) as turnosPendientes,
        COUNT(CASE WHEN estado = 'EN_CURSO' THEN 1 END) as turnosEnCurso,
        COUNT(CASE WHEN estado = 'COMPLETADO' THEN 1 END) as turnosCompletados
      FROM "Turno" 
      WHERE "horaCreacion" >= ${fechaEspecifica} AND "horaCreacion" <= ${finFecha}
    `;

    console.log('\n📈 Métricas generales:');
    console.log(metricasGenerales);

  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDashboardData(); 