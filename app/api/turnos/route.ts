import { NextRequest, NextResponse } from 'next/server';
import { TurnoService } from '@/src/lib/turnoService';
import { TimeService } from '@/src/lib/timeService';
import { auth } from '@/auth';

const turnoService = new TurnoService();

export async function GET(request: NextRequest) {
  try {
    // Configurar la hora simulada desde los headers
    TimeService.setFromHeaders(request.headers);
    
    const turnos = await turnoService.obtenerTurnosDelDia();
    
    return NextResponse.json({
      success: true,
      turnos,
      debug: {
        currentTime: TimeService.getCurrentTime().toISOString(),
        isSimulationMode: TimeService.isSimulationMode(),
        simulatedTime: TimeService.getSimulatedTime()?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error obteniendo turnos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Configurar la hora simulada desde los headers
    TimeService.setFromHeaders(request.headers);
    
    const body = await request.json();
    const { movilId, conductorId, rutaId, horaSalida } = body;

    // Validaciones
    if (!movilId || !conductorId || !rutaId || !horaSalida) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan campos requeridos' 
        },
        { status: 400 }
      );
    }

    // Obtener el usuario de la sesión
    // TEMPORAL: Comentando auth() para evitar error en desarrollo
    // const session = await auth();
    // const usuarioId = session?.user?.id ? parseInt(session.user.id) : null;
    const usuarioId = null; // Usar null temporalmente

    const turno = await turnoService.crearTurno(
      parseInt(movilId),
      parseInt(conductorId),
      parseInt(rutaId),
      horaSalida,
      usuarioId
    );

    return NextResponse.json({
      success: true,
      turno,
      turnoId: turno.id, // Agregar el ID del turno para impresión
      debug: {
        currentTime: TimeService.getCurrentTime().toISOString(),
        isSimulationMode: TimeService.isSimulationMode(),
        simulatedTime: TimeService.getSimulatedTime()?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error creando turno:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    console.error('Error message:', errorMessage);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    // Manejar el caso especial de huecos regenerados
    if (errorMessage.includes('TIEMPO_INSUFICIENTE_HUECOS_REGENERADOS')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Los huecos han sido regenerados debido a tiempo insuficiente. Por favor, selecciona un nuevo hueco de la lista actualizada.',
          huecosRegenerados: true,
          details: errorMessage.replace('TIEMPO_INSUFICIENTE_HUECOS_REGENERADOS: ', '')
        },
        { status: 409 } // Conflict - indica que se necesita nueva selección
      );
    }
    
    // Determinar el código de estado HTTP apropiado
    let statusCode = 500;
    if (errorMessage.includes('tiempo mínimo') || errorMessage.includes('pasado')) {
      statusCode = 400; // Bad Request
    } else if (errorMessage.includes('no encontrado') || errorMessage.includes('no está activo')) {
      statusCode = 404; // Not Found
    } else if (errorMessage.includes('conflicto') || errorMessage.includes('ya tiene')) {
      statusCode = 409; // Conflict
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: statusCode }
    );
  }
} 