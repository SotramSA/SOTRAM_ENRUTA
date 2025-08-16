import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

// Helper para obtener el rango de la semana (Lunes a Sábado)
const getWeekRange = (date: Date) => {
  // Rango amplio: desde domingo 10 hasta domingo 17 para asegurar que incluya todo
  const startDate = new Date(2025, 7, 10); // 10 de agosto (domingo)
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(2025, 7, 17); // 17 de agosto (domingo)
  endDate.setHours(23, 59, 59, 999);
  
  console.log('Rango amplio de semana (10-17 agosto):', {
    inicio: startDate.toISOString(),
    fin: endDate.toISOString(),
    fechaInicio: startDate.toISOString().split('T')[0],
    fechaFin: endDate.toISOString().split('T')[0],
    diaInicio: startDate.getDay(),
    diaFin: endDate.getDay()
  });

  return { startOfWeek: startDate, endOfWeek: endDate };
};

export async function GET(
  request: Request,
  { params }: { params: { movil: string } }
) {
  const { movil } = params;

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
