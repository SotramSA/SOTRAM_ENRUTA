import { NextRequest, NextResponse } from 'next/server';
import { TurnoService } from '@/src/lib/turnoService';
import { TimeService } from '@/src/lib/timeService';
import { prisma } from '@/src/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Removed startup debug log
    
    // Configurar TimeService con headers de simulación
    TimeService.setFromHeaders(request.headers);
    const currentTime = TimeService.getCurrentTime();
    const today = currentTime.toISOString().split('T')[0];
    
    // Removed current date/time debug log

    // Obtener todos los automóviles activos
    const automoviles = await prisma.automovil.findMany({
      where: { activo: true },
      select: { id: true, movil: true }
    });

    // Removed automóviles count debug log

    if (automoviles.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        meta: {
          fecha: today,
          totalAutomoviles: 0
        }
      });
    }

    // Obtener todas las rutas de todos los móviles para hoy
    const turnoService = new TurnoService();
    const todasLasRutas = [];

    for (const automovil of automoviles) {
      try {
        const rutasMovil = await turnoService.obtenerRutasMovilHoy(automovil.id);
        
        // Filtrar solo las rutas de hoy
        const rutasHoy = rutasMovil.filter(ruta => {
          const rutaDate = new Date(ruta.horaSalida).toISOString().split('T')[0];
          return rutaDate === today;
        });

        // Agregar información del móvil a cada ruta
        const rutasConMovil = rutasHoy.map(ruta => ({
          ...ruta,
          movilNombre: automovil.movil,
          automovilId: automovil.id
        }));

        todasLasRutas.push(...rutasConMovil);
      } catch (error) {
        console.error(`❌ Error obteniendo rutas del móvil ${automovil.movil}:`, error);
        // Continuar con el siguiente móvil en caso de error
      }
    }

    // Removed total routes debug log

    // Ordenar por hora de salida
    todasLasRutas.sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime());

    return NextResponse.json({
      success: true,
      data: todasLasRutas,
      total: todasLasRutas.length,
      meta: {
        fecha: today,
        totalAutomoviles: automoviles.length,
        horaConsulta: currentTime.toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo todas las rutas del día:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}