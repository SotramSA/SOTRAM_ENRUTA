import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Obtener inspección por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de inspección inválido' },
        { status: 400 }
      );
    }

    const inspeccion = await prisma.inspeccion.findUnique({
      where: { id },
      include: {
        automovil: {
          select: {
            movil: true,
            placa: true,
            enRevision: true,
            revisionPreventiva: true
          }
        }
      }
    });

    if (!inspeccion) {
      return NextResponse.json(
        { error: 'Inspección no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(inspeccion);
  } catch (error) {
    console.error('Error al obtener inspección:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar inspección por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de inspección inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      nombreIngeniero,
      cedulaIngeniero,
      firmaDigital,
      observaciones,
      aprobada
    } = body;

    // Verificar que la inspección existe
    const inspeccionExistente = await prisma.inspeccion.findUnique({
      where: { id }
    });

    if (!inspeccionExistente) {
      return NextResponse.json(
        { error: 'Inspección no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la inspección
    const inspeccionActualizada = await prisma.inspeccion.update({
      where: { id },
      data: {
        nombreIngeniero,
        cedulaIngeniero,
        firmaDigital,
        observaciones,
        aprobada
      },
      include: {
        automovil: {
          select: {
            movil: true,
            placa: true
          }
        }
      }
    });

    // Actualizar el estado del automóvil según el resultado de la inspección
    if (aprobada !== undefined) {
      await prisma.automovil.update({
        where: { id: inspeccionExistente.automovilId },
        data: {
          enRevision: !aprobada,
          revisionPreventiva: aprobada
        }
      });
    }

    return NextResponse.json(inspeccionActualizada);
  } catch (error) {
    console.error('Error al actualizar inspección:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar inspección por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de inspección inválido' },
        { status: 400 }
      );
    }

    // Verificar que la inspección existe
    const inspeccionExistente = await prisma.inspeccion.findUnique({
      where: { id }
    });

    if (!inspeccionExistente) {
      return NextResponse.json(
        { error: 'Inspección no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar la inspección
    await prisma.inspeccion.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: 'Inspección eliminada correctamente',
      id: id
    });
  } catch (error) {
    console.error('Error al eliminar inspección:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}