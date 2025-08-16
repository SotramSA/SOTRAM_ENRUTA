import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Se requieren fechaInicio y fechaFin' }, { status: 400 });
    }

    // Convertir fechas a zona horaria local (Colombia)
    const inicio = new Date(fechaInicio + 'T00:00:00-05:00');
    const fin = new Date(fechaFin + 'T23:59:59-05:00');

    // 1. Horarios con más demanda de rutas (24 horas) - Convertir a hora colombiana
    const demandaPorHora = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM ("horaSalida" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')) as hora,
        COUNT(*) as cantidad
      FROM "Turno" 
      WHERE "horaSalida" >= ${inicio} AND "horaSalida" <= ${fin}
      GROUP BY EXTRACT(HOUR FROM ("horaSalida" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota'))
      ORDER BY hora
    `;



    // Completar las 24 horas con 0 si no hay datos
    const demandaCompleta = Array.from({ length: 24 }, (_, i) => {
      const horaData = (demandaPorHora as any[]).find(h => Number(h.hora) === i);
      return {
        hora: i,
        cantidad: horaData ? Number(horaData.cantidad || 0) : 0
      };
    });

    // 2. Tiempo promedio de turno
    const tiempoPromedio = await prisma.$queryRaw`
      SELECT 
        AVG(EXTRACT(EPOCH FROM ("horaSalida" - "horaCreacion")) / 60) as tiempoPromedioMinutos
      FROM "Turno" 
      WHERE "horaSalida" >= ${inicio} AND "horaSalida" <= ${fin}
      AND "horaSalida" > "horaCreacion"
    `;

    // 3. Automóviles más activos
    const automovilesActivos = await prisma.$queryRaw`
      SELECT 
        a.id,
        a.movil,
        a.placa,
        COUNT(t.id) as turnosAsignados
      FROM "Automovil" a
      INNER JOIN "Turno" t ON a.id = t."movilId" 
        AND t."horaSalida" >= ${inicio} 
        AND t."horaSalida" <= ${fin}
      WHERE a.activo = true
      GROUP BY a.id, a.movil, a.placa
      ORDER BY turnosAsignados DESC
      LIMIT 10
    `;



    // 4. Conductores más activos
    const conductoresActivos = await prisma.$queryRaw`
      SELECT 
        c.id,
        c.nombre,
        c.cedula,
        COUNT(t.id) as turnosAsignados
      FROM "Conductor" c
      INNER JOIN "Turno" t ON c.id = t."conductorId" 
        AND t."horaSalida" >= ${inicio} 
        AND t."horaSalida" <= ${fin}
      WHERE c.activo = true
      GROUP BY c.id, c.nombre, c.cedula
      ORDER BY turnosAsignados DESC
      LIMIT 10
    `;



    // 5. Balance entre rutas con prioridad 1 (A y B)
    const balanceRutas = await prisma.$queryRaw`
      SELECT 
        r.nombre,
        COUNT(t.id) as cantidadTurnos
      FROM "Ruta" r
      INNER JOIN "Turno" t ON r.id = t."rutaId" 
        AND t."horaSalida" >= ${inicio} 
        AND t."horaSalida" <= ${fin}
      WHERE r.prioridad = 1
      GROUP BY r.id, r.nombre
      ORDER BY r.nombre
    `;



    // 6. Métricas generales
    const metricasGenerales = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalTurnos,
        COUNT(CASE WHEN estado = 'PENDIENTE' THEN 1 END) as turnosPendientes,
        COUNT(CASE WHEN estado = 'EN_CURSO' THEN 1 END) as turnosEnCurso,
        COUNT(CASE WHEN estado = 'COMPLETADO' THEN 1 END) as turnosCompletados
      FROM "Turno" 
      WHERE "horaSalida" >= ${inicio} AND "horaSalida" <= ${fin}
    `;







    // Convertir todos los BigInt a Number de manera segura
    const tiempoPromedioNum = Number((tiempoPromedio as any[])[0]?.tiempopromediominutos || 0);

    const automovilesActivosConvertidos = (automovilesActivos as any[]).map(item => ({
      id: Number(item.id),
      movil: item.movil,
      placa: item.placa,
      turnosAsignados: Number(item.turnosasignados || 0)
    }));

    const conductoresActivosConvertidos = (conductoresActivos as any[]).map(item => ({
      id: Number(item.id),
      nombre: item.nombre,
      cedula: item.cedula,
      turnosAsignados: Number(item.turnosasignados || 0)
    }));

    const balanceRutasConvertido = (balanceRutas as any[]).map(item => ({
      nombre: item.nombre,
      cantidadTurnos: Number(item.cantidadturnos || 0)
    }));

    const metricasGeneralesConvertidas = {
      totalTurnos: Number((metricasGenerales as any[])[0]?.totalturnos || 0),
      turnosPendientes: Number((metricasGenerales as any[])[0]?.turnospendientes || 0),
      turnosEnCurso: Number((metricasGenerales as any[])[0]?.turnosencurso || 0),
      turnosCompletados: Number((metricasGenerales as any[])[0]?.turnoscompletados || 0)
    };

    const response = {
      demandaPorHora: demandaCompleta,
      tiempoPromedioMinutos: tiempoPromedioNum,
      automovilesActivos: automovilesActivosConvertidos,
      conductoresActivos: conductoresActivosConvertidos,
      balanceRutas: balanceRutasConvertido,
      metricasGenerales: metricasGeneralesConvertidas,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin
    };



    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en dashboard:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 