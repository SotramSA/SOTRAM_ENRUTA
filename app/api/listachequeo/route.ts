import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { numeroMovil, nombreInspector } = body;

    if (!numeroMovil || !nombreInspector) {
      return NextResponse.json(
        { error: 'Número de móvil y nombre del inspector son requeridos' },
        { status: 400 }
      );
    }

    // Buscar el automóvil por número de móvil
    const automovil = await prisma.automovil.findFirst({
      where: {
        movil: numeroMovil,
        activo: true
      }
    });

    if (!automovil) {
      return NextResponse.json(
        { error: 'No se encontró el móvil en la base de datos' },
        { status: 404 }
      );
    }

    // Crear el registro de lista de chequeo
    const listaChequeo = await prisma.listaChequeo.create({
      data: {
        nombre: nombreInspector,
        movilId: automovil.id,
        fecha: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      mensaje: 'Lista de chequeo guardada exitosamente',
      listaChequeo: {
        id: listaChequeo.id,
        fecha: listaChequeo.fecha,
        nombre: listaChequeo.nombre,
        movil: numeroMovil
      }
    });

  } catch (error) {
    console.error('Error al guardar lista de chequeo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
