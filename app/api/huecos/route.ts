import { NextRequest, NextResponse } from 'next/server';
import { TurnoService } from '@/src/lib/turnoService';
import { TimeService } from '@/src/lib/timeService';

export async function POST(request: NextRequest) {
  try {
    // Configurar el TimeService con los headers de simulación
    TimeService.setFromHeaders(request.headers);
    
    const body = await request.json();
    const { movilId, conductorId } = body;

    // Validar parámetros requeridos
    if (!movilId || !conductorId) {
      return NextResponse.json({
        error: 'Se requieren: movilId, conductorId'
      }, { status: 400 });
    }

    const turnoService = new TurnoService();

    // Obtener huecos disponibles para el móvil y conductor específicos
    const huecos = await turnoService.obtenerHuecosDisponibles(
      parseInt(movilId),
      parseInt(conductorId)
    );

    // Obtener asignación automática
    let asignacionAutomatica = null;
    try {
      console.log('🔍 Intentando obtener asignación automática para:', { movilId, conductorId });
      asignacionAutomatica = await turnoService.asignacionAutomatica(
        parseInt(movilId),
        parseInt(conductorId)
      );
      console.log('✅ Asignación automática obtenida:', asignacionAutomatica);
    } catch (error) {
      console.log('❌ No se pudo hacer asignación automática:', error);
    }

    return NextResponse.json({
      success: true,
      huecos,
      asignacionAutomatica,
      debug: {
        currentTime: TimeService.getCurrentTime().toISOString(),
        isSimulationMode: TimeService.isSimulationMode(),
        simulatedTime: TimeService.getSimulatedTime()?.toISOString() || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo huecos:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    }, { status: 500 });
  }
} 