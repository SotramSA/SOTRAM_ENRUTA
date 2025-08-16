import { NextRequest, NextResponse } from 'next/server';
import { TimeService } from '@/src/lib/timeService';

export async function GET(request: NextRequest) {
  try {
    // Configurar el TimeService con los headers de simulación
    TimeService.setFromHeaders(request.headers);
    
    const currentTime = TimeService.getCurrentTime();
    const isSimulationMode = TimeService.isSimulationMode();
    const simulatedTime = TimeService.getSimulatedTime();
    const debugInfo = TimeService.getDebugInfo();

    return NextResponse.json({
      currentTime: currentTime.toISOString(),
      currentTimeLocal: currentTime.toLocaleString('es-ES'),
      isSimulationMode,
      simulatedTime: simulatedTime?.toISOString() || null,
      simulatedTimeLocal: simulatedTime?.toLocaleString('es-ES') || null,
      debug: debugInfo
    });
  } catch (error) {
    console.error('Error obteniendo información de tiempo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Configurar el TimeService con los headers de simulación
    TimeService.setFromHeaders(request.headers);
    
    const body = await request.json();
    const { action, time, hours, minutes, seconds, advanceMinutes } = body;

    switch (action) {
      case 'set':
        if (time) {
          const newTime = new Date(time);
          TimeService.setSimulatedTime(newTime);
        } else if (hours !== undefined && minutes !== undefined) {
          TimeService.setSpecificTime(hours, minutes, seconds || 0);
        } else {
          return NextResponse.json(
            { error: 'Se requiere time o hours/minutes' },
            { status: 400 }
          );
        }
        break;

      case 'advance':
        if (advanceMinutes) {
          TimeService.advanceTime(advanceMinutes);
        } else {
          return NextResponse.json(
            { error: 'Se requiere advanceMinutes' },
            { status: 400 }
          );
        }
        break;

      case 'rewind':
        if (advanceMinutes) {
          TimeService.rewindTime(advanceMinutes);
        } else {
          return NextResponse.json(
            { error: 'Se requiere advanceMinutes' },
            { status: 400 }
          );
        }
        break;

      case 'reset':
        TimeService.resetToRealTime();
        break;

      default:
        return NextResponse.json(
          { error: 'Acción no válida. Use: set, advance, rewind, reset' },
          { status: 400 }
        );
    }

    // Devolver el estado actual después de la acción
    const currentTime = TimeService.getCurrentTime();
    const isSimulationMode = TimeService.isSimulationMode();

    return NextResponse.json({
      success: true,
      message: `Acción ${action} ejecutada correctamente`,
      currentTime: currentTime.toISOString(),
      currentTimeLocal: currentTime.toLocaleString('es-ES'),
      isSimulationMode
    });

  } catch (error) {
    console.error('Error controlando tiempo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 