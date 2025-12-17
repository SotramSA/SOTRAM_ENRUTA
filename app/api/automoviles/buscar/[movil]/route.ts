import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TimeService } from '@/src/lib/timeService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movil: string }> }
) {
  try {
    TimeService.setFromHeaders(request.headers);
    const { movil } = await params;
    const numeroMovil = movil;

    // Buscar el automóvil por número de móvil
    const automovil = await prisma.automovil.findFirst({
      where: {
        movil: numeroMovil,
        activo: true
      }
    });

    if (automovil) {
      // Verificar si ya existe una lista de chequeo para hoy
      const ahora = TimeService.getCurrentTime();
      const { date: bogotaNow } = TimeService.getHoraBogota(ahora);
      const hoy = new Date(Date.UTC(bogotaNow.getFullYear(), bogotaNow.getMonth(), bogotaNow.getDate(), 0, 0, 0, 0));
      const manana = new Date(Date.UTC(bogotaNow.getFullYear(), bogotaNow.getMonth(), bogotaNow.getDate() + 1, 0, 0, 0, 0));

      const listaChequeoHoy = await prisma.listaChequeo.findFirst({
        where: {
          automovilId: automovil.id,
          fecha: {
            gte: hoy,
            lt: manana,
          },
        },
      });

      if (listaChequeoHoy) {
        return NextResponse.json({
          encontrado: true,
          automovil: {
            id: automovil.id,
            movil: automovil.movil,
            placa: automovil.placa,
          },
          yaRegistrado: true,
          listaChequeo: {
            items: listaChequeoHoy.items,
            fecha: listaChequeoHoy.fecha,
            inspector: listaChequeoHoy.inspector,
          },
        });
      }

      return NextResponse.json({
        encontrado: true,
        automovil: {
          id: automovil.id,
          movil: automovil.movil,
          placa: automovil.placa,
        },
        yaRegistrado: false,
      });
    } else {
      return NextResponse.json({
        encontrado: false,
        mensaje: 'No se encontró el móvil en la base de datos'
      });
    }
  } catch (error) {
    console.error('Error al buscar automóvil:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
