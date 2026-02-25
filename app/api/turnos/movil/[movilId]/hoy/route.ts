import { NextRequest, NextResponse } from 'next/server';
import { TurnoService } from '@/src/lib/turnoService';
import { TimeService } from '@/src/lib/timeService';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movilId: string }> }
) {
  try {
    const { movilId: movilIdStr } = await params;
    
    const movilNumero = parseInt(movilIdStr);
    
    if (isNaN(movilNumero)) {
      console.error('❌ ID de móvil inválido:', movilIdStr);
      return NextResponse.json(
        { error: 'ID de móvil inválido' },
        { status: 400 }
      );
    }

    // Configurar TimeService con headers de simulación
    TimeService.setFromHeaders(request.headers);

    // Buscar el automóvil por número de móvil para obtener el automovilId
    const automovil = await prisma.automovil.findFirst({
      where: { movil: movilIdStr }
    });

    if (!automovil) {
      console.error('❌ Móvil no encontrado:', movilIdStr);
      return NextResponse.json(
        { error: 'Móvil no encontrado' },
        { status: 404 }
      );
    }

    const currentTime = TimeService.getCurrentTime();

    const turnoService = new TurnoService();
    const rutasMovilHoy = await turnoService.obtenerRutasMovilHoy(automovil.id);

    const turnosProcessed = rutasMovilHoy.map(turno => ({
      ...turno,
      horaFormateada: new Date(turno.horaSalida).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      esFuturo: new Date(turno.horaSalida) > currentTime,
      tiempoRestante: (() => {
        const turnoTime = new Date(turno.horaSalida);
        const diff = turnoTime.getTime() - currentTime.getTime();
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          return `${hours}h ${minutes}m`;
        }
        return null;
      })()
    }));

    return NextResponse.json({
      success: true,
      data: turnosProcessed,
      meta: {
        movilId: movilIdStr,
        total: turnosProcessed.length,
        simulatedTime: TimeService.isSimulationMode()
      }
    });

  } catch (error) {
    console.error('❌ API /api/turnos/movil/[movilId]/hoy - Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
