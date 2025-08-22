import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movil: string }> }
) {
  try {
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
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const manana = new Date(hoy);
      manana.setDate(hoy.getDate() + 1);

      const listaChequeoHoy = await prisma.listaChequeo.findFirst({
        where: {
          movilId: automovil.id,
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
            nombre: listaChequeoHoy.nombre,
            fecha: listaChequeoHoy.fecha,
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
