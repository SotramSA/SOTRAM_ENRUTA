import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { TimeService } from '@/src/lib/timeService';

export async function GET(request: Request) {
  try {
    TimeService.setFromHeaders(request.headers as Headers);
    const ahora = TimeService.getCurrentTime();
    const { date: bogotaNow } = TimeService.getHoraBogota(ahora);
    const startOfDay = new Date(Date.UTC(bogotaNow.getFullYear(), bogotaNow.getMonth(), bogotaNow.getDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(bogotaNow.getFullYear(), bogotaNow.getMonth(), bogotaNow.getDate() + 1, 0, 0, 0, 0));

    // Obtener todos los vehículos activos
    const vehiculos = await prisma.automovil.findMany({
      where: {
        activo: true
      },
      orderBy: {
        movil: 'asc'
      },
      include: {
        listaChequeo: {
          where: {
            fecha: {
              gte: startOfDay,
              lt: endOfDay
            }
          },
          orderBy: {
            fecha: 'desc'
          },
          take: 1 // Solo la más reciente del día
        }
      }
    });

    // Transformar los datos para la respuesta
    const vehiculosFormateados = vehiculos.map(vehiculo => ({
      id: vehiculo.id,
      movil: vehiculo.movil,
      placa: vehiculo.placa,
      activo: vehiculo.activo,
      listaChequeo: vehiculo.listaChequeo.length > 0 ? {
        id: vehiculo.listaChequeo[0].id,
        fecha: vehiculo.listaChequeo[0].fecha,
        items: vehiculo.listaChequeo[0].items,
        automovilId: vehiculo.listaChequeo[0].automovilId
      } : undefined
    }));

    return NextResponse.json({
      vehiculos: vehiculosFormateados,
      fecha: ahora.toISOString(),
      total: vehiculosFormateados.length,
      completados: vehiculosFormateados.filter(v => v.listaChequeo).length,
      pendientes: vehiculosFormateados.filter(v => !v.listaChequeo).length
    });

  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
