import { prisma } from '@/src/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const { automovilId, fecha, descripcion } = await request.json();
    
    if (!automovilId || !fecha || !descripcion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Verificar que la sanción existe
    const sancionExistente = await prisma.sancionAutomovil.findUnique({
      where: { id }
    });

    if (!sancionExistente) {
      return NextResponse.json({ error: 'Sanción no encontrada' }, { status: 404 });
    }

    // Verificar que el automóvil existe y está activo
    const automovil = await prisma.automovil.findFirst({
      where: { id: automovilId, activo: true }
    });

    if (!automovil) {
      return NextResponse.json({ error: 'Automóvil no encontrado o inactivo' }, { status: 400 });
    }

    // Verificar que la fecha es válida
    const fechaObj = new Date(fecha);
    
    if (isNaN(fechaObj.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
    }

    // Actualizar la sanción
    const sancionActualizada = await prisma.sancionAutomovil.update({
      where: { id },
      data: {
        automovilId,
        fecha: fechaObj,
        descripcion: descripcion.trim()
      },
      include: {
        automovil: {
          select: {
            id: true,
            movil: true,
            placa: true
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
    const sancionExistente = await prisma.sancionAutomovil.findUnique({
      where: { id }
    });

    if (!sancionExistente) {
      return NextResponse.json({ error: 'Sanción no encontrada' }, { status: 404 });
    }

    // Eliminar la sanción
    await prisma.sancionAutomovil.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Sanción eliminada correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar sanción' }, { status: 500 });
  }
} 