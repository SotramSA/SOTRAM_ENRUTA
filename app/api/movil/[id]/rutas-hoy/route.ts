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

    // Obtener la fecha actual para filtrar solo los turnos de hoy
    const ahora = TimeService.getCurrentTime();
    const fechaHoy = ahora.toISOString().split('T')[0];

    // Filtrar las rutas para mostrar solo las de hoy
    const rutasHoy = todasLasRutas.filter(ruta => {
      // Extraer la fecha de horaSalida que está en formato ISO
      const fechaRuta = typeof ruta.horaSalida === 'string' 
        ? ruta.horaSalida.split('T')[0] 
        : ahora.toISOString().split('T')[0]; // Para programados usar fecha actual
      
      return fechaRuta === fechaHoy;
    });

    console.log('🔍 API rutas-hoy: Rutas filtradas para hoy:', {
      movilId,
      fechaHoy,
      totalRutasOriginales: todasLasRutas.length,
      rutasHoy: rutasHoy.length,
      rutas: rutasHoy.map(r => ({
        hora: r.horaSalida,
        ruta: r.ruta?.nombre,
        conductor: r.conductor.nombre,
        estado: r.estado
      }))
    });

    return NextResponse.json({
      success: true,
      data: rutasHoy,
      total: rutasHoy.length,
      meta: {
        movilId: movilId.toString(),
        fecha: fechaHoy,
        totalOriginal: todasLasRutas.length,
        filtradoHoy: rutasHoy.length
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