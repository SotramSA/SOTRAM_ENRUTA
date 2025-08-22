import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

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
    const automovil = await prisma.automovil.findFirst({
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

    const programaciones = await prisma.programacion.findMany({
      where: {
        movilId: automovil.id,
        fecha: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      orderBy: {
        fecha: 'asc',
      },
    });

    console.log('Programaciones encontradas:', programaciones.length);
    programaciones.forEach(p => {
      // Extraer solo la fecha sin la hora para calcular correctamente el día
      const fechaStr = p.fecha.toISOString().split('T')[0]; // "2025-08-12"
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fechaLocal = new Date(year, month - 1, day);
      const diaSemana = fechaLocal.getDay();
      
      console.log('Programación:', {
        id: p.id,
        fecha: p.fecha,
        fechaExtraida: fechaStr,
        fechaLocal: fechaLocal.toISOString(),
        dia: diaSemana,
        nombreDia: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana],
        ruta: p.ruta,
        hora: p.hora
      });
    });

    return NextResponse.json({ 
      encontrado: true, 
      programaciones, 
      rango: { inicio: startOfWeek.toISOString(), fin: endOfWeek.toISOString() }
    });

  } catch (error) {
    console.error('Error al consultar la programación:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
