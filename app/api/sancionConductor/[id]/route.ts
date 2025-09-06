import { prisma } from '@/src/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const conductorId = body.conductorId;
    const fechaInicio = body.fechaInicio;
    const fechaFin = body.fechaFin;
    const descripcion = (body.descripcion ?? body.motivo ?? '').toString();
    
    if (!conductorId || !fechaInicio || !fechaFin || !descripcion) {
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
    const fechaInicioObj = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);
    if (isNaN(fechaInicioObj.getTime()) || isNaN(fechaFinObj.getTime())) {
      return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 });
    }

    // Actualizar la sanción
    const sancionActualizada = await prisma.sancionConductor.update({
      where: { id },
      data: {
        conductorId,
        fechaInicio: fechaInicioObj,
        fechaFin: fechaFinObj,
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