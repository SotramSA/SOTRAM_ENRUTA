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
    const rutas = await turnoService.obtenerRutasMovilHoy(movilId);

    console.log('🔍 API rutas-hoy: Rutas encontradas:', {
      movilId,
      totalRutas: rutas.length,
      rutas: rutas.map(r => ({
        hora: r.horaSalida,
        ruta: r.ruta?.nombre,
        conductor: r.conductor.nombre,
        estado: r.estado
      }))
    });

    return NextResponse.json({
      success: true,
      data: rutas,
      total: rutas.length
    });

  } catch (error) {
    console.error('🔍 API rutas-hoy: Error obteniendo rutas del móvil:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 