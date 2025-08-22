import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function GET() {
  try {
    // Obtener la fecha actual (solo fecha, sin hora)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

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
              lte: endOfDay
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
        nombre: vehiculo.listaChequeo[0].nombre,
        movilId: vehiculo.listaChequeo[0].movilId
      } : undefined
    }));

    return NextResponse.json({
      vehiculos: vehiculosFormateados,
      fecha: today.toISOString(),
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
