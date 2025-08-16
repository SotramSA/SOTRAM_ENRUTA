import { NextRequest, NextResponse } from 'next/server';
import { TurnoService } from '@/src/lib/turnoService';
import { TimeService } from '@/src/lib/timeService';

export async function GET(request: NextRequest) {
  try {
    // Configurar el TimeService con los headers de simulación
    TimeService.setFromHeaders(request.headers);
    
    const turnoService = new TurnoService();
    const estadisticas = await turnoService.obtenerEstadisticasRotacion();

    return NextResponse.json({
      success: true,
      estadisticas,
      debug: {
        currentTime: TimeService.getCurrentTime().toISOString(),
        isSimulationMode: TimeService.isSimulationMode(),
        simulatedTime: TimeService.getSimulatedTime()?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 