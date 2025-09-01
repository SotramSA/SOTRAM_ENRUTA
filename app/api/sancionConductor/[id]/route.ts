import { prisma } from '@/src/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const { conductorId, fecha, descripcion } = await request.json();
    
    if (!conductorId || !fecha || !descripcion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Verificar que la sanción existe
    const sancionExistente = await prisma.sancionConductor.findUnique({
      where: { id }
    });

    if (!sancionExistente) {
      return NextResponse.json({ error: 'Sanción no encontrada' }, { status: 404 });
    }

    // Verificar que el conductor existe y está activo
    const conductor = await prisma.conductor.findFirst({
      where: { id: conductorId, activo: true }
    });

    if (!conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado o inactivo' }, { status: 400 });
    }

    // Verificar que la fecha es válida
    const fechaObj = new Date(fecha);
    
    if (isNaN(fechaObj.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    // Actualizar la sanción
    const sancionActualizada = await prisma.sancionConductor.update({
      where: { id },
      data: {
        conductorId,
        fecha: fechaObj,
        descripcion: descripcion.trim()
      },
              include: {
          conductor: {
            select: {
              id: true,
              nombre: true,
              cedula: true
            }
          }
        }
    });
    
    return NextResponse.json(sancionActualizada);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar sanción' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    // Verificar que la sanción existe
    const sancionExistente = await prisma.sancionConductor.findUnique({
      where: { id }
    });

    if (!sancionExistente) {
      return NextResponse.json({ error: 'Sanción no encontrada' }, { status: 404 });
    }

    // Eliminar la sanción
    await prisma.sancionConductor.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Sanción eliminada correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar sanción' }, { status: 500 });
  }
} 