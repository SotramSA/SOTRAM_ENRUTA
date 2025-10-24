import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Obtener todas las inspecciones o filtrar por automóvil
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const automovilId = searchParams.get('automovilId');

    let inspecciones;
    
    if (automovilId) {
      inspecciones = await prisma.inspeccion.findMany({
        where: {
          automovilId: parseInt(automovilId)
        },
        include: {
          automovil: {
            select: {
              movil: true,
              placa: true
            }
          }
        },
        orderBy: {
          fechaCreacion: 'desc'
        }
      });
    } else {
      inspecciones = await prisma.inspeccion.findMany({
        include: {
          automovil: {
            select: {
              movil: true,
              placa: true
            }
          }
        },
        orderBy: {
          fechaCreacion: 'desc'
        }
      });
    }

    return NextResponse.json(inspecciones);
  } catch (error) {
    console.error('Error al obtener inspecciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva inspección
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      automovilId,
      nombreIngeniero,
      cedulaIngeniero,
      firmaDigital,
      observaciones,
      aprobada
    } = body;

    // Validaciones básicas
    if (!automovilId || !nombreIngeniero || !cedulaIngeniero) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: automovilId, nombreIngeniero, cedulaIngeniero' },
        { status: 400 }
      );
    }

    // Verificar que el automóvil existe
    const automovil = await prisma.automovil.findUnique({
      where: { id: parseInt(automovilId) }
    });

    if (!automovil) {
      return NextResponse.json(
        { error: 'El automóvil especificado no existe' },
        { status: 404 }
      );
    }

    // Crear la inspección
    const nuevaInspeccion = await prisma.inspeccion.create({
      data: {
        automovilId: parseInt(automovilId),
        nombreIngeniero,
        cedulaIngeniero,
        firmaDigital,
        observaciones,
        aprobada: aprobada || false
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

    // Si la inspección es aprobada, actualizar el estado del automóvil
    if (aprobada) {
      await prisma.automovil.update({
        where: { id: parseInt(automovilId) },
        data: {
          enRevision: false,
          revisionPreventiva: true
        }
      });
    } else {
      // Si no es aprobada, mantener en revisión
      await prisma.automovil.update({
        where: { id: parseInt(automovilId) },
        data: {
          enRevision: true,
          revisionPreventiva: false
        }
      });
    }

    return NextResponse.json(nuevaInspeccion, { status: 201 });
  } catch (error) {
    console.error('Error al crear inspección:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar inspección existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      nombreIngeniero,
      cedulaIngeniero,
      firmaDigital,
      observaciones,
      aprobada
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de inspección requerido' },
        { status: 400 }
      );
    }

    // Verificar que la inspección existe
    const inspeccionExistente = await prisma.inspeccion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!inspeccionExistente) {
      return NextResponse.json(
        { error: 'Inspección no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la inspección
    const inspeccionActualizada = await prisma.inspeccion.update({
      where: { id: parseInt(id) },
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

// DELETE - Eliminar inspección
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de inspección requerido' },
        { status: 400 }
      );
    }

    // Verificar que la inspección existe
    const inspeccionExistente = await prisma.inspeccion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!inspeccionExistente) {
      return NextResponse.json(
        { error: 'Inspección no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar la inspección
    await prisma.inspeccion.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ message: 'Inspección eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar inspección:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}