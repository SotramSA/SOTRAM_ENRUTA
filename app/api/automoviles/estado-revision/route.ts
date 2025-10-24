import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT - Cambiar estado de revisión de un automóvil
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { automovilId, enRevision, revisionPreventiva } = body;

    if (!automovilId) {
      return NextResponse.json(
        { error: 'ID del automóvil requerido' },
        { status: 400 }
      );
    }

    // Verificar que el automóvil existe
    const automovil = await prisma.automovil.findUnique({
      where: { id: parseInt(automovilId) }
    });

    if (!automovil) {
      return NextResponse.json(
        { error: 'Automóvil no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el estado del automóvil
    const automovilActualizado = await prisma.automovil.update({
      where: { id: parseInt(automovilId) },
      data: {
        enRevision: enRevision !== undefined ? enRevision : automovil.enRevision,
        revisionPreventiva: revisionPreventiva !== undefined ? revisionPreventiva : automovil.revisionPreventiva
      }
    });

    return NextResponse.json({
      message: 'Estado de revisión actualizado correctamente',
      automovil: {
        id: automovilActualizado.id,
        movil: automovilActualizado.movil,
        placa: automovilActualizado.placa,
        enRevision: automovilActualizado.enRevision,
        revisionPreventiva: automovilActualizado.revisionPreventiva
      }
    });
  } catch (error) {
    console.error('Error al actualizar estado de revisión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener automóviles en revisión
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enRevision = searchParams.get('enRevision');
    const revisionPreventiva = searchParams.get('revisionPreventiva');

    let whereClause: any = {};

    if (enRevision !== null) {
      whereClause.enRevision = enRevision === 'true';
    }

    if (revisionPreventiva !== null) {
      whereClause.revisionPreventiva = revisionPreventiva === 'true';
    }

    const automoviles = await prisma.automovil.findMany({
      where: whereClause,
      select: {
        id: true,
        movil: true,
        placa: true,
        enRevision: true,
        revisionPreventiva: true,
        activo: true,
        disponible: true,
        inspecciones: {
          orderBy: {
            fechaCreacion: 'desc'
          },
          take: 1,
          select: {
            id: true,
            fechaCreacion: true,
            nombreIngeniero: true,
            aprobada: true,
            observaciones: true
          }
        }
      },
      orderBy: {
        movil: 'asc'
      }
    });

    return NextResponse.json(automoviles);
  } catch (error) {
    console.error('Error al obtener automóviles en revisión:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}