import { NextResponse } from 'next/server';
import prismaWithRetry from '@/lib/prismaClient';

// Definición de rutas especiales para mapeo
const RUTAS_ESPECIALES = {
  'DESPACHO D. RUT7 CORZO LORETO': [
    '04:50', '04:57', '05:04', '05:11'
  ],
  'DESPACHO E RUT7 CORZO': [
    '04:55', '05:05', '05:15'
  ],
  'DESPACHO D RUT4 PAMPA-CORZO': [
    '04:50', '05:00', '05:10'
  ]
}

// Función para determinar si una hora pertenece a una ruta especial
function getRutaEspecialByHora(hora: number, rutaBase: string): string {
  const horaStr = `${Math.floor(hora / 100).toString().padStart(2, '0')}:${(hora % 100).toString().padStart(2, '0')}`
  
  // Solo aplicar para programaciones que usan Despacho A como base
  if (rutaBase === 'Despacho A') {
    for (const [rutaEspecial, horarios] of Object.entries(RUTAS_ESPECIALES)) {
      if (horarios.includes(horaStr)) {
        return rutaEspecial
      }
    }
  }
  
  return rutaBase
}

// Función para convertir hora numérica a ISO string
function horaToISOString(hora: number, fecha: Date): string {
  const hours = Math.floor(hora / 100)
  const minutes = hora % 100
  const fechaHora = new Date(fecha)
  fechaHora.setHours(hours, minutes, 0, 0)
  return fechaHora.toISOString()
}

// Helper para obtener el rango de la semana actual (Lunes a Domingo)
const getWeekRange = (date: Date) => {
  // Obtener el día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
  const dayOfWeek = date.getDay();
  
  // Calcular cuántos días hay que restar para llegar al lunes
  // Si es domingo (0), restamos 6 días para llegar al lunes anterior
  // Si es lunes (1), no restamos nada
  // Si es martes (2), restamos 1 día, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Calcular el lunes de la semana actual
  
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysToSubtract);
  monday.setHours(0, 0, 0, 0);
  
  // Calcular el domingo de la semana actual (6 días después del lunes)
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  // Asegurar que las fechas estén en UTC para evitar problemas de zona horaria
  const mondayUTC = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0));
  const sundayUTC = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999));
  
  console.log('Rango de semana actual (Lunes a Domingo):', {
    fechaActual: date.toISOString(),
    diaActual: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek],
    lunes: mondayUTC.toISOString(),
    domingo: sundayUTC.toISOString(),
    fechaInicio: mondayUTC.toISOString().split('T')[0],
    fechaFin: sundayUTC.toISOString().split('T')[0]
  });

  return { startOfWeek: mondayUTC, endOfWeek: sundayUTC };
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ movil: string }> }
) {
  const { movil } = await params;

  if (!movil) {
    return NextResponse.json({ error: 'Número de móvil es requerido' }, { status: 400 });
  }

  try {
    const automovil = await prismaWithRetry.automovil.findFirst({
      where: { movil },
    });

    if (!automovil) {
      return NextResponse.json({ encontrado: false, mensaje: 'Móvil no encontrado' }, { status: 404 });
    }

    const today = new Date();
    const { startOfWeek, endOfWeek } = getWeekRange(today);

    console.log('Rango de búsqueda:', {
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
      startDay: startOfWeek.getDay(),
      endDay: endOfWeek.getDay()
    });

    const programaciones = await prismaWithRetry.programacion.findMany({
      where: {
        automovilId: automovil.id,
        fecha: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      include: {
        ruta: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: [
        { fecha: 'asc' },
        { hora: 'asc' }
      ],
    });

    console.log('Programaciones encontradas:', programaciones.length);
    
    // Mapear las programaciones para incluir ruta correcta y hora en formato ISO
    const programacionesMapeadas = programaciones.map(p => {
      const rutaOriginal = p.ruta?.nombre || 'Sin ruta'
      const rutaFinal = getRutaEspecialByHora(p.hora, rutaOriginal)
      const horaISO = horaToISOString(p.hora, p.fecha)
      
      // Extraer solo la fecha sin la hora para calcular correctamente el día
      const fechaStr = p.fecha.toISOString().split('T')[0]; // "2025-08-12"
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day);
      const diaSemana = fechaLocal.getDay();
      
      console.log('Programación mapeada:', {
        id: p.id,
        fecha: p.fecha,
        fechaExtraida: fechaStr,
        fechaLocal: fechaLocal.toISOString(),
        dia: diaSemana,
        nombreDia: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana],
        rutaOriginal,
        rutaFinal,
        horaNum: p.hora,
        horaISO
      });
      
      return {
        id: p.id,
        fecha: p.fecha.toISOString(),
        ruta: rutaFinal,
        hora: horaISO
      }
    });

    return NextResponse.json({ 
      encontrado: true, 
      programaciones: programacionesMapeadas, 
      rango: { inicio: startOfWeek.toISOString(), fin: endOfWeek.toISOString() }
    });

  } catch (error) {
    console.error('Error al consultar la programación:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  } finally {
    await prismaWithRetry.$disconnect();
  }
}
