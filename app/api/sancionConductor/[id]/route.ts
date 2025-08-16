import { prisma } from '@/src/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const { conductorId, fechaInicio, fechaFin, motivo } = await request.json();
    
    if (!conductorId || !fechaInicio || !fechaFin || !motivo) {
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

    // Verificar que las fechas son válidas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    if (fin < inicio) {
      return NextResponse.json({ error: 'La fecha de fin no puede ser menor a la fecha de inicio' }, { status: 400 });
    }

    // Actualizar la sanción
    const sancionActualizada = await prisma.sancionConductor.update({
      where: { id },
      data: {
        conductorId,
        fechaInicio: inicio,
        fechaFin: fin,
        motivo: motivo.trim()
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