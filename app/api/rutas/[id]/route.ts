import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const ruta = await prisma.ruta.findUnique({
      where: { id }
    });

    if (!ruta) {
      return NextResponse.json(
        { error: 'Ruta no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(ruta);
  } catch (error) {
    console.error('Error al obtener ruta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();

    const {
      nombre,
      descripcion,
      frecuenciaMin,
      frecuenciaMax,
      frecuenciaDefault,
      frecuenciaActual,
      prioridad,
      unaVezDia,
      activo
    } = body;

    // Verificar si la ruta existe
    const existingRuta = await prisma.ruta.findUnique({
      where: { id }
    });

    if (!existingRuta) {
      return NextResponse.json(
        { error: 'Ruta no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la ruta
    const updatedRuta = await prisma.ruta.update({
      where: { id },
      data: {
        nombre: nombre || existingRuta.nombre,
        descripcion: descripcion || existingRuta.descripcion,
        frecuenciaMin: frecuenciaMin !== undefined ? frecuenciaMin : existingRuta.frecuenciaMin,
        frecuenciaMax: frecuenciaMax !== undefined ? frecuenciaMax : existingRuta.frecuenciaMax,
        frecuenciaDefault: frecuenciaDefault !== undefined ? frecuenciaDefault : existingRuta.frecuenciaDefault,
        frecuenciaActual: frecuenciaActual !== undefined ? frecuenciaActual : existingRuta.frecuenciaActual,
        prioridad: prioridad !== undefined ? prioridad : existingRuta.prioridad,
        unaVezDia: unaVezDia !== undefined ? unaVezDia : existingRuta.unaVezDia,
        activo: activo !== undefined ? activo : existingRuta.activo,
        fechaActualizacion: new Date()
      }
    });

    return NextResponse.json(updatedRuta);
  } catch (error) {
    console.error('Error al actualizar ruta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    // Verificar si la ruta existe
    const existingRuta = await prisma.ruta.findUnique({
      where: { id }
    });

    if (!existingRuta) {
      return NextResponse.json(
        { error: 'Ruta no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si hay turnos asociados a esta ruta
    const turnosAsociados = await prisma.turno.findMany({
      where: { rutaId: id }
    });

    if (turnosAsociados.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la ruta porque tiene turnos asociados' },
        { status: 400 }
      );
    }

    // Eliminar la ruta
    await prisma.ruta.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Ruta eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar ruta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 