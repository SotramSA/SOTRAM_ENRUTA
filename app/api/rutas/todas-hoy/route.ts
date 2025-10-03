import { NextRequest, NextResponse } from 'next/server';
import { TimeService } from '@/src/lib/timeService';
import { prisma } from '@/src/lib/prisma';

// Caché en memoria con TTL corto (30s) para respuestas de "todas-hoy"
const CACHE_TTL_MS = 30_000;
type CachedPayload = {
  success: boolean;
  data: any[];
  total: number;
  meta: {
    fecha: string;
    totalAutomoviles: number;
    horaConsulta: string;
  };
};
let cachedResponse: { timestamp: number; fechaKey: string; payload: CachedPayload } | null = null;

export async function GET(request: NextRequest) {
  try {
    // Removed startup debug log
    
    // Configurar TimeService con headers de simulación
    TimeService.setFromHeaders(request.headers);
    const currentTime = TimeService.getCurrentTime();
    const today = currentTime.toISOString().split('T')[0];

    // Responder desde caché si es válido
    if (
      cachedResponse &&
      cachedResponse.fechaKey === today &&
      currentTime.getTime() - cachedResponse.timestamp < CACHE_TTL_MS
    ) {
      return NextResponse.json(cachedResponse.payload);
    }
    
    // Removed current date/time debug log

    // Contar automóviles activos (más eficiente que cargar todos)
    const totalAutomoviles = await prisma.automovil.count({ where: { activo: true } });

    // Calcular inicio y fin del día en UTC
    const now = new Date();
    const inicioDiaActual = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));
    const finDiaActual = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1
    ));

    // Consulta batched: Turnos de hoy (select mínimo)
    const turnosHoy = await prisma.turno.findMany({
      where: {
        horaSalida: {
          gte: inicioDiaActual,
          lt: finDiaActual,
        },
      },
      select: {
        id: true,
        horaSalida: true,
        estado: true,
        ruta: { select: { id: true, nombre: true } },
        automovil: { select: { id: true, movil: true } },
        conductor: { select: { id: true, nombre: true } },
      },
    });

    // Consulta batched: Programaciones de hoy (select mínimo)
    const programadosHoy = await prisma.programacion.findMany({
      where: {
        fecha: {
          gte: inicioDiaActual,
          lt: finDiaActual,
        },
      },
      select: {
        id: true,
        fecha: true,
        hora: true,
        ruta: { select: { id: true, nombre: true } },
        automovil: { select: { id: true, movil: true } },
        realizadoPorId: true,
      },
    });

    // Utilidad: ISO con milisegundos fijo
    const toFixedISOString = (date: Date): string => {
      const pad = (num: number, size: number = 2) => String(num).padStart(size, '0');
      return (
        date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        '.' + pad(date.getMilliseconds(), 3) +
        'Z'
      );
    };

    // Mapear turnos al formato esperado
    const eventosTurnos = turnosHoy.map(t => ({
      id: t.id,
      horaSalida: t.horaSalida.toISOString(),
      ruta: t.ruta ? { id: t.ruta.id, nombre: t.ruta.nombre } : null,
      movil: t.automovil ? { id: t.automovil.id, movil: t.automovil.movil } : { id: 0, movil: 'N/A' },
      conductor: t.conductor ? { id: t.conductor.id, nombre: t.conductor.nombre } : { id: 0, nombre: 'N/A' },
      tipo: 'turno',
      estado: t.estado || 'NO_COMPLETADO',
      movilNombre: t.automovil ? t.automovil.movil : 'N/A',
      automovilId: t.automovil ? t.automovil.id : 0,
    }));

    // Mapear programados al formato esperado
    const eventosProgramados = programadosHoy.map(p => {
      const horaString = String(p.hora);
      const normalized = horaString.padStart(4, '0');
      const hours = Number(normalized.slice(0, -2));
      const minutes = Number(normalized.slice(-2));

      const fechaAsignacion = new Date(p.fecha);
      fechaAsignacion.setHours(hours, minutes, 0, 0);

      const estado = p.realizadoPorId ? 'COMPLETADO' : 'NO_COMPLETADO';

      return {
        id: p.id,
        horaSalida: toFixedISOString(fechaAsignacion),
        ruta: p.ruta ? { id: p.ruta.id, nombre: p.ruta.nombre } : null,
        movil: p.automovil ? { id: p.automovil.id, movil: p.automovil.movil } : { id: 0, movil: 'N/A' },
        conductor: { id: 0, nombre: 'Programado' },
        tipo: 'programado',
        estado,
        movilNombre: p.automovil ? p.automovil.movil : 'N/A',
        automovilId: p.automovil ? p.automovil.id : 0,
      };
    });

    // Unir y ordenar por hora de salida
    const todasLasRutas = [...eventosTurnos, ...eventosProgramados]
      .sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime());

    // Removed total routes debug log

    // Ordenar por hora de salida
    todasLasRutas.sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime());

    const payload: CachedPayload = {
      success: true,
      data: todasLasRutas,
      total: todasLasRutas.length,
      meta: {
        fecha: today,
        totalAutomoviles: totalAutomoviles,
        horaConsulta: currentTime.toISOString(),
      },
    };

    // Guardar en caché
    cachedResponse = {
      timestamp: currentTime.getTime(),
      fechaKey: today,
      payload,
    };

    const res = NextResponse.json(payload);
    // Cabeceras de caché HTTP para clientes y proxies
    res.headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
    return res;

  } catch (error) {
    console.error('❌ Error obteniendo todas las rutas del día:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}