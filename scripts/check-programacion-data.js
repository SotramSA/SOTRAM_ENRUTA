const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProgramacionData() {
  try {
    console.log('🔍 Verificando integridad de datos de programación...\n');

    // 1. Contar total de automóviles activos y disponibles
    const automovilesActivos = await prisma.automovil.count({
      where: {
        activo: true,
        disponible: true
      }
    });
    console.log('🚗 Total de móviles activos y disponibles:', automovilesActivos);

    // 2. Contar total de programaciones
    const totalProgramaciones = await prisma.programacion.count();
    console.log('📋 Total de programaciones en la base de datos:', totalProgramaciones);

    // 3. Verificar programaciones por fecha
    const programacionesPorFecha = await prisma.programacion.groupBy({
      by: ['fecha'],
      _count: {
        id: true
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    console.log('\n📅 Programaciones por fecha:');
    programacionesPorFecha.forEach(p => {
      console.log(`  ${p.fecha.toISOString().split('T')[0]}: ${p._count.id} programaciones`);
    });

    // 4. Verificar automovilId que no existen (usando LEFT JOIN)
    const programacionesConAutomovilInvalido = await prisma.$queryRaw`
      SELECT p.id, p."automovilId", p.fecha 
      FROM "Programacion" p 
      LEFT JOIN "Automovil" a ON p."automovilId" = a.id 
      WHERE a.id IS NULL
    `;

    if (programacionesConAutomovilInvalido.length > 0) {
      console.log('\n❌ Programaciones con automovilId inválido:');
      programacionesConAutomovilInvalido.forEach(p => {
        console.log(`  ID: ${p.id}, automovilId: ${p.automovilId}, fecha: ${p.fecha.toISOString().split('T')[0]}`);
      });
    } else {
      console.log('\n✅ Todas las programaciones tienen automovilId válido');
    }

    // 5. Verificar programaciones para la fecha actual
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    const programacionesHoy = await prisma.programacion.findMany({
      where: {
        fecha: {
          gte: hoy,
          lt: manana
        }
      },
      include: {
        automovil: {
          select: {
            id: true,
            movil: true,
            activo: true,
            disponible: true
          }
        }
      }
    });

    console.log(`\n📅 Programaciones para hoy (${hoy.toISOString().split('T')[0]}):`, programacionesHoy.length);

    // 6. Verificar si hay móviles programados que no están activos/disponibles
    const programacionesConMovilInactivo = programacionesHoy.filter(p => 
      !p.automovil || !p.automovil.activo || !p.automovil.disponible
    );

    if (programacionesConMovilInactivo.length > 0) {
      console.log('\n⚠️ Programaciones con móviles inactivos/no disponibles:');
      programacionesConMovilInactivo.forEach(p => {
        console.log(`  ID: ${p.id}, automovilId: ${p.automovilId}, móvil: ${p.automovil?.movil || 'NO ENCONTRADO'}, activo: ${p.automovil?.activo}, disponible: ${p.automovil?.disponible}`);
      });
    }

    // 7. Contar móviles únicos programados para hoy
    const movilesUnicos = new Set(programacionesHoy.map(p => p.automovilId));
    console.log(`\n🚗 Móviles únicos programados para hoy: ${movilesUnicos.size}`);
    console.log(`📊 Promedio de programaciones por móvil: ${(programacionesHoy.length / movilesUnicos.size).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProgramacionData();
