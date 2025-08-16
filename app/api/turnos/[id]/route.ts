import { NextRequest, NextResponse } from 'next/server';
import { TurnoService } from '@/src/lib/turnoService';
import { TimeService } from '@/src/lib/timeService';

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