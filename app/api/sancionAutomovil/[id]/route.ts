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
    console.log('PUT /api/sancionAutomovil body:', body);
    const automovilId = body.automovilId;
    const fechaInicio = body.fechaInicio;
    const fechaFin = body.fechaFin;
    const descripcion = (body.descripcion ?? body.motivo ?? '').toString();
    
    if (!automovilId || !fechaInicio || !fechaFin || !descripcion) {
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

    // Verificar que las fechas son válidas
    const fechaInicioObj = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);
    if (isNaN(fechaInicioObj.getTime()) || isNaN(fechaFinObj.getTime())) {
      return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 });
    }

    // Actualizar la sanción
    const sancionActualizada = await prisma.sancionAutomovil.update({
      where: { id },
      data: {
        automovilId,
        fechaInicio: fechaInicioObj,
        fechaFin: fechaFinObj,
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
    console.error('Error en sancionAutomovil PUT:', error);
    return NextResponse.json({ 
      error: 'Error al actualizar sanción',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
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