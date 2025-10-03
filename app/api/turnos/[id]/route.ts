import { NextRequest, NextResponse } from 'next/server';
import { TurnoService } from '@/src/lib/turnoService';
import { TimeService } from '@/src/lib/timeService';
import { prisma } from '@/src/lib/prisma';

const turnoService = new TurnoService();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Configurar la hora simulada desde los headers
    TimeService.setFromHeaders(request.headers);
    
    const { id } = await params;
    const turnoId = parseInt(id);

    if (isNaN(turnoId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID de turno inválido' 
        },
        { status: 400 }
      );
    }

    // Eliminar el turno
    await turnoService.eliminarTurno(turnoId);

    return NextResponse.json({
      success: true,
      message: 'Turno eliminado exitosamente',
      debug: {
        currentTime: TimeService.getCurrentTime().toISOString(),
        isSimulationMode: TimeService.isSimulationMode(),
        simulatedTime: TimeService.getSimulatedTime()?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error eliminando turno:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Configurar la hora simulada desde los headers
    TimeService.setFromHeaders(request.headers);

    const { id } = await params;
    const turnoId = parseInt(id);

    if (isNaN(turnoId)) {
      return NextResponse.json(
        { success: false, error: 'ID de turno inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { estado } = body || {};

    if (!estado || typeof estado !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Campo "estado" es obligatorio' },
        { status: 400 }
      );
    }

    // Validar estados permitidos (esquema binario)
    const estadosPermitidos = ['COMPLETADO', 'NO_COMPLETADO'];
    if (!estadosPermitidos.includes(estado)) {
      return NextResponse.json(
        { success: false, error: `Estado inválido: ${estado}` },
        { status: 400 }
      );
    }

    // Verificar que el turno existe
    const turno = await prisma.turno.findUnique({ where: { id: turnoId } });
    if (!turno) {
      return NextResponse.json(
        { success: false, error: 'Turno no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar estado
    await prisma.turno.update({
      where: { id: turnoId },
      data: { estado }
    });

    return NextResponse.json({
      success: true,
      message: 'Estado del turno actualizado',
      data: { id: turnoId, estado },
      debug: {
        currentTime: TimeService.getCurrentTime().toISOString(),
        isSimulationMode: TimeService.isSimulationMode(),
        simulatedTime: TimeService.getSimulatedTime()?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error actualizando estado del turno:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}