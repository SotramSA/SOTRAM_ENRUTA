import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import prismaWithRetry from '@/lib/prismaClient';

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
      include: { automovil: true }
    });

    if (!programado) {
      return NextResponse.json(
        { success: false, error: 'Programado no encontrado' },
        { status: 404 }
      );
    }

    if (programado.estado !== 'PENDIENTE') {
      return NextResponse.json(
        { success: false, error: 'Este programado ya está asignado' },
        { status: 400 }
      );
    }

    // Verificar que el móvil existe
    const movil = await prismaWithRetry.automovil.findFirst({
      where: {
        id: parseInt(movilId),
        activo: true,
        disponible: true,
        OR: [
          { colectivo: false },
          { colectivo: null }
        ]
      }
    });

    if (!movil) {
      return NextResponse.json(
        { success: false, error: 'Móvil no encontrado o no disponible para programado' },
        { status: 404 }
      );
    }

    // Asignar el programado al móvil (marcarlo como no disponible y cambiar móvil)
    const programadoActualizado = await prisma.programacion.update({
      where: { id: programadoId },
      data: {
        automovilId: parseInt(movilId),
        estado: 'ASIGNADO'
      },
      include: {
        automovil: true,
        ruta: true
      }
    });

    console.log('✅ Programado asignado exitosamente:', {
      id: programadoActualizado.id,
      ruta: programadoActualizado.ruta?.nombre || 'Sin Ruta',
      movilAnterior: programado.automovil?.movil || 'Sin móvil',
      movilNuevo: programadoActualizado.automovil?.movil || 'Sin móvil'
    });

    return NextResponse.json({
      success: true,
      message: 'Programado asignado exitosamente',
      programado: {
        id: programadoActualizado.id,
        ruta: programadoActualizado.ruta?.nombre || 'Sin Ruta',
        hora: programadoActualizado.hora,
        automovil: programadoActualizado.automovil ? {
          id: programadoActualizado.automovil.id,
          movil: programadoActualizado.automovil.movil
        } : null,
        estado: programadoActualizado.estado
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
