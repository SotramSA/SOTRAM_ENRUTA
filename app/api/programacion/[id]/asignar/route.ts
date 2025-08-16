import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const programadoId = parseInt(id);
    
    if (isNaN(programadoId)) {
      return NextResponse.json(
        { success: false, error: 'ID de programado inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { movilId } = body;

    if (!movilId || isNaN(parseInt(movilId))) {
      return NextResponse.json(
        { success: false, error: 'ID de móvil es requerido y debe ser válido' },
        { status: 400 }
      );
    }

    console.log('🔄 Asignando programado:', { programadoId, movilId });

    // Verificar que el programado existe y está disponible
    const programado = await prisma.programacion.findUnique({
      where: { id: programadoId },
      include: { movil: true }
    });

    if (!programado) {
      return NextResponse.json(
        { success: false, error: 'Programado no encontrado' },
        { status: 404 }
      );
    }

    if (!programado.disponible) {
      return NextResponse.json(
        { success: false, error: 'Este programado ya está asignado' },
        { status: 400 }
      );
    }

    // Verificar que el móvil existe
    const movil = await prisma.automovil.findUnique({
      where: { id: parseInt(movilId) }
    });

    if (!movil) {
      return NextResponse.json(
        { success: false, error: 'Móvil no encontrado' },
        { status: 404 }
      );
    }

    // Asignar el programado al móvil (marcarlo como no disponible y cambiar móvil)
    const programadoActualizado = await prisma.programacion.update({
      where: { id: programadoId },
      data: {
        movilId: parseInt(movilId),
        disponible: false
      },
      include: {
        movil: true
      }
    });

    console.log('✅ Programado asignado exitosamente:', {
      id: programadoActualizado.id,
      ruta: programadoActualizado.ruta,
      movilAnterior: programado.movil.movil,
      movilNuevo: programadoActualizado.movil.movil
    });

    return NextResponse.json({
      success: true,
      message: 'Programado asignado exitosamente',
      programado: {
        id: programadoActualizado.id,
        ruta: programadoActualizado.ruta,
        hora: programadoActualizado.hora,
        movil: {
          id: programadoActualizado.movil.id,
          movil: programadoActualizado.movil.movil
        },
        disponible: programadoActualizado.disponible
      }
    });

  } catch (error) {
    console.error('❌ Error asignando programado:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
