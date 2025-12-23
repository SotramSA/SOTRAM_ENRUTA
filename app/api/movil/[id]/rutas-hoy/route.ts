import { NextRequest, NextResponse } from 'next/server';
import { TurnoService } from '@/src/lib/turnoService';
import { TimeService } from '@/src/lib/timeService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Configurar la hora simulada desde los headers
    TimeService.setFromHeaders(request.headers);
    
    const { id } = await params;
    const movilId = parseInt(id);
    
    console.log('🔍 API rutas-hoy: Recibida petición para móvil:', movilId);
    console.log('🔍 API rutas-hoy: Hora actual (simulada):', TimeService.getCurrentTime().toISOString());
    
    if (isNaN(movilId)) {
      console.error('🔍 API rutas-hoy: ID inválido:', id);
      return NextResponse.json(
        { error: 'ID de móvil inválido' },
        { status: 400 }
      );
    }

    const turnoService = new TurnoService();
    const todasLasRutas = await turnoService.obtenerRutasMovilHoy(movilId);
    return NextResponse.json({
      success: true,
      data: todasLasRutas,
      total: todasLasRutas.length,
      meta: {
        movilId: movilId.toString()
      }
    });

  } catch (error) {
    console.error('🔍 API rutas-hoy: Error obteniendo rutas del móvil:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
