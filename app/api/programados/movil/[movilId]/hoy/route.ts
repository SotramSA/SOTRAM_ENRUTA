import { NextRequest, NextResponse } from 'next/server';
import prismaWithRetry from '@/lib/prismaClient';
import { TimeService } from '@/src/lib/timeService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movilId: string }> }
) {
  try {
    const { movilId } = await params;
    
    if (!movilId) {
      return NextResponse.json({ error: 'ID de móvil requerido' }, { status: 400 });
    }

    // Configurar el TimeService con los headers de simulación
    TimeService.setFromHeaders(request.headers);
    const ahora = TimeService.getCurrentTime();
    const inicioDiaActual = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const finDiaActual = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 0, 0);

    console.log('🔍 Buscando programados del móvil para hoy (local):', {
      movilId,
      inicioDiaActual: inicioDiaActual.toISOString(),
      finDiaActual: finDiaActual.toISOString()
    });

    // Buscar el automóvil por número de móvil
    const automovil = await prismaWithRetry.automovil.findFirst({
      where: { movil: movilId }
    });

    if (!automovil) {
      return NextResponse.json({ error: 'Móvil no encontrado' }, { status: 404 });
    }

    // Obtener programados del móvil para hoy (filtrado en BD por fecha local)
    const programados = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.programacion.findMany({
        where: {
          automovilId: automovil.id,
          fecha: {
            gte: inicioDiaActual,
            lt: finDiaActual
          }
        },
        include: {
          automovil: {
            select: {
              id: true,
              movil: true,
              placa: true
            }
          },
          ruta: {
            select: {
              id: true,
              nombre: true
            }
          }
        },
        orderBy: { hora: 'asc' }
      });
    });

    // Ya están filtrados por fecha en la consulta
    const programadosHoy = programados;

    console.log('📊 Programados del móvil encontrados:', {
      total: programados.length,
      hoy: programadosHoy.length,
      rangoLocal: {
        inicio: inicioDiaActual.toISOString(),
        fin: finDiaActual.toISOString()
      },
      movil: automovil.movil
    });

    // Procesar programados para incluir información adicional
    const programadosProcesados = programadosHoy.map(prog => {
      // Convertir la hora del programado (número) a Date usando la fecha del programado
      let horaProgramado: Date;
      
      if (typeof prog.hora === 'number') {
        // Convertir hora numérica (ej: 800 = 8:00, 1430 = 14:30) a Date
        const horas = Math.floor(prog.hora / 100);
        const minutos = prog.hora % 100;
        
        horaProgramado = new Date(prog.fecha);
        horaProgramado.setHours(horas, minutos, 0, 0);
      } else {
        // Fallback si la hora viene en otro formato
        horaProgramado = new Date(prog.fecha);
      }

      return {
        id: prog.id,
        fecha: prog.fecha,
        hora: prog.hora,
        horaProgramado: horaProgramado.toISOString(),
        ruta: prog.ruta,
        automovil: prog.automovil,
        estaEnFuturo: horaProgramado > ahora,
        horaFormateada: typeof prog.hora === 'number' ? 
          `${Math.floor(prog.hora / 100).toString().padStart(2, '0')}:${(prog.hora % 100).toString().padStart(2, '0')}` : 
          String(prog.hora)
      };
    });

    const fechaLocal = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

    return NextResponse.json({
      success: true,
      programados: programadosProcesados,
      estadisticas: {
        total: programadosProcesados.length,
        futuros: programadosProcesados.filter(p => p.estaEnFuturo).length,
        pasados: programadosProcesados.filter(p => !p.estaEnFuturo).length,
        fechaLocal
      },
      debug: TimeService.getDebugInfo()
    });

  } catch (error) {
    console.error('❌ Error obteniendo programados del móvil:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
