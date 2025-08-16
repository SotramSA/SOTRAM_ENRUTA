import { NextRequest, NextResponse } from 'next/server';
import { FrecuenciaCalculator } from '@/src/lib/frecuenciaCalculator';
import { TimeService } from '@/src/lib/timeService';
import { prisma } from '@/src/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Configurar el TimeService con los headers de simulación
    TimeService.setFromHeaders(request.headers);
    
    const body = await request.json();
    const { 
      horaSolicitud, 
      movilId, 
      conductorId
    } = body;

    // Validar parámetros requeridos
    if (!horaSolicitud || !movilId || !conductorId) {
      return NextResponse.json({
        error: 'Se requieren: horaSolicitud, movilId, conductorId'
      }, { status: 400 });
    }

    // Crear instancia del calculador
    const calculator = new FrecuenciaCalculator();
    await calculator.inicializarConfiguracion();

    // Simular la hora actual como la hora de solicitud
    const horaActual = new Date(horaSolicitud);
    
    // Obtener información del móvil y conductor
    const movil = await prisma.automovil.findUnique({
      where: { id: parseInt(movilId) }
    });

    const conductor = await prisma.conductor.findUnique({
      where: { id: parseInt(conductorId) }
    });

    if (!movil || !conductor) {
      return NextResponse.json({
        error: 'Móvil o conductor no encontrado'
      }, { status: 404 });
    }

    // Obtener sugerencias de rutas
    const sugerencias = await calculator.sugerirRutas(
      parseInt(movilId), 
      parseInt(conductorId)
    );

    // Obtener huecos disponibles para asignación automática
    const huecosDisponibles = await calculator.obtenerHuecosDisponibles();

    // Intentar asignación automática
    let asignacionAutomatica = null;
    try {
      asignacionAutomatica = await calculator.asignacionAutomatica(
        parseInt(movilId), 
        parseInt(conductorId)
      );
    } catch (error) {
      // Si no hay huecos disponibles, no es un error crítico
      console.log('No se pudo hacer asignación automática:', error);
    }

    // Obtener estadísticas de rotación del móvil
    const estadisticasRotacion = await calculator.obtenerRutasHechasPorMovil(
      parseInt(movilId)
    );

    // Obtener la última ruta del móvil
    const ultimaRuta = await calculator.obtenerUltimaRutaMovil(parseInt(movilId));

    // Preparar respuesta
    const resultado = {
      horaSolicitud: horaActual.toLocaleString('es-ES'),
      movil: {
        id: movil.id,
        nombre: movil.movil,
        activo: movil.activo
      },
      conductor: {
        id: conductor.id,
        nombre: conductor.nombre,
        activo: conductor.activo
      },
      sugerencias: sugerencias.map(s => ({
        ruta: s.rutaNombre,
        horaSalida: s.horaSalida.toLocaleString('es-ES'),
        prioridad: s.prioridad,
        razon: s.razon,
        frecuenciaCalculada: s.frecuenciaActual
      })),
      huecosDisponibles: huecosDisponibles.slice(0, 10).map(h => ({
        ruta: h.rutaNombre,
        horaSalida: h.horaSalida.toLocaleString('es-ES'),
        prioridad: h.prioridad,
        razon: h.razon,
        frecuenciaCalculada: h.frecuenciaCalculada
      })),
      asignacionAutomatica: asignacionAutomatica ? {
        mejorHueco: {
          ruta: asignacionAutomatica.mejorHueco.rutaNombre,
          horaSalida: asignacionAutomatica.mejorHueco.horaSalida.toLocaleString('es-ES'),
          prioridad: asignacionAutomatica.mejorHueco.prioridad,
          razon: asignacionAutomatica.mejorHueco.razon
        },
        razon: asignacionAutomatica.razon,
        alternativas: asignacionAutomatica.alternativas.slice(0, 3).map(a => ({
          ruta: a.rutaNombre,
          horaSalida: a.horaSalida.toLocaleString('es-ES'),
          prioridad: a.prioridad,
          razon: a.razon
        }))
      } : null,
      estadisticasRotacion,
      ultimaRuta: ultimaRuta ? {
        ruta: ultimaRuta.rutaNombre,
        horaSalida: ultimaRuta.horaSalida.toLocaleString('es-ES'),
        estado: ultimaRuta.estado
      } : null,
      debug: {
        currentTime: TimeService.getCurrentTime().toISOString(),
        isSimulationMode: TimeService.isSimulationMode(),
        simulatedTime: TimeService.getSimulatedTime()?.toISOString() || null
      }
    };

    return NextResponse.json(resultado);

  } catch (error) {
    console.error('Error en prueba de enrutamiento:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      detalles: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Configurar el TimeService con los headers de simulación
    TimeService.setFromHeaders(request.headers);
    
    const calculator = new FrecuenciaCalculator();
    
    // Obtener huecos disponibles
    const huecos = await calculator.obtenerHuecosDisponibles();
    
    // Obtener estadísticas de rotación
    const estadisticas = await calculator.obtenerEstadisticasRotacion();
    
    // Obtener turnos del día
    const turnos = await calculator.obtenerTurnosDelDia();

    return NextResponse.json({
      success: true,
      huecos: huecos.map(h => ({
        ...h,
        horaSalida: h.horaSalida.toISOString()
      })),
      estadisticas,
      turnos: turnos.map(t => ({
        ...t,
        horaSalida: t.horaSalida.toISOString()
      })),
      debug: {
        currentTime: TimeService.getCurrentTime().toISOString(),
        isSimulationMode: TimeService.isSimulationMode(),
        simulatedTime: TimeService.getSimulatedTime()?.toISOString() || null
      }
    });
  } catch (error) {
    console.error('Error en test de enrutamiento:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 