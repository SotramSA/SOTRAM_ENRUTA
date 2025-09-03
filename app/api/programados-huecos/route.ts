import { NextRequest, NextResponse } from 'next/server';
import prismaWithRetry from '@/lib/prismaClient';
import { TimeService } from '@/src/lib/timeService';

export async function GET(request: NextRequest) {
  try {
    TimeService.setFromHeaders(request.headers);
    const ahora = TimeService.getCurrentTime();
    
    // Obtener solo la fecha de hoy (YYYY-MM-DD)
    const fechaHoy = ahora.toISOString().split('T')[0]; // Ejemplo: "2025-01-15"

    console.log('🔍 Obteniendo programados del día:', {
      fechaHoy,
      ahoraCompleto: ahora.toISOString()
    });

    // Obtener todos los programados del día usando solo la fecha
    const programados = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.programacion.findMany({
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

    // Filtrar por fecha de hoy comparando solo la parte de fecha
    const programadosHoy = programados.filter(prog => {
      const fechaProgramado = new Date(prog.fecha).toISOString().split('T')[0];
      return fechaProgramado === fechaHoy;
    });

    console.log('📊 Programados encontrados:', {
      total: programados.length,
      hoy: programadosHoy.length,
      fechaHoy,
      muestraProgramados: programadosHoy.slice(0, 3).map(p => ({
        fecha: new Date(p.fecha).toISOString().split('T')[0],
        ruta: p.ruta?.nombre || 'Sin ruta',
        hora: p.hora,
        automovilId: p.automovilId
      }))
    });

    // Mostrar estadísticas de disponibilidad (Nota: la tabla Programacion no tiene campo 'disponible')
    const programadosAsignados = programadosHoy.filter(p => p.automovilId);
    const programadosSinAsignar = programadosHoy.filter(p => !p.automovilId);
    
    console.log('📊 Estadísticas de programación:', {
      totalHoy: programadosHoy.length,
      asignados: programadosAsignados.length,
      sinAsignar: programadosSinAsignar.length,
      detalleAsignados: programadosAsignados.slice(0, 5).map(p => ({
        id: p.id,
        ruta: p.ruta?.nombre || 'Sin ruta',
        hora: p.hora,
        automovilId: p.automovilId,
        movil: p.automovil?.movil || 'Sin móvil'
      }))
    });

    // Separar programados disponibles y asignados
    const programadosDisponibles = [];
    const programadosAsignadosList = [];

    for (const prog of programadosHoy) {
      try {
        // Convertir la hora del programado (número) a Date usando la fecha del programado
        let horaProgramado: Date;
        
        if (typeof prog.hora === 'number') {
          // La hora se guarda como número (ej: 450 = 04:50)
          const horas = Math.floor(prog.hora / 100);
          const minutos = prog.hora % 100;
          
          // Crear la fecha usando los componentes de la fecha del programado
          // para evitar conversiones de zona horaria
          const fechaProgramado = new Date(prog.fecha);
          horaProgramado = new Date(
            fechaProgramado.getFullYear(),
            fechaProgramado.getMonth(),
            fechaProgramado.getDate(),
            horas,
            minutos,
            0,
            0
          );
        } else {
          // Fallback por si viene en otro formato
          const fechaProgramado = new Date(prog.fecha);
          horaProgramado = new Date(
            fechaProgramado.getFullYear(),
            fechaProgramado.getMonth(),
            fechaProgramado.getDate(),
            7, // Hora por defecto
            0,
            0,
            0
          );
        }

        const rutaNombre = prog.ruta?.nombre || 'Sin ruta';

        console.log(`🔍 Evaluando programado: ${rutaNombre}`, {
          id: prog.id,
          horaProgramado: horaProgramado.toISOString(),
          ahora: ahora.toISOString(),
          estaEnFuturo: horaProgramado > ahora,
          automovilId: prog.automovilId,
          tieneAutomovil: !!prog.automovilId
        });

        if (!prog.automovilId && horaProgramado > ahora) {
          // Programado sin asignar y en el futuro = disponible como hueco
          const hueco = {
            rutaId: prog.ruta?.id || 0,
            rutaNombre,
            horaSalida: horaProgramado.toISOString(),
            prioridad: 'CUALQUIERA' as const,
            razon: `Programado disponible (${Math.round((horaProgramado.getTime() - ahora.getTime()) / (1000 * 60))} min)`,
            frecuenciaCalculada: 0,
            programadoId: prog.id,
            tipo: 'programado'
          };
          
          programadosDisponibles.push(hueco);
          console.log(`✅ Programado agregado como hueco disponible:`, hueco);
        } else if (prog.automovilId) {
          // Programado ya asignado
          programadosAsignadosList.push({
            id: prog.id,
            tipo: 'programado',
            horaSalida: horaProgramado.toISOString(),
            ruta: { 
              id: prog.ruta?.id || 0,
              nombre: rutaNombre
            },
            movil: { 
              id: prog.automovil?.id || 0, 
              movil: prog.automovil?.movil || 'Sin móvil'
            },
            conductor: { 
              id: 0,
              nombre: 'Programado' 
            },
            estado: 'PROGRAMADO'
          });
        } else {
          console.log(`❌ Programado NO incluido como hueco:`, {
            ruta: rutaNombre,
            automovilId: prog.automovilId,
            estaEnFuturo: horaProgramado > ahora,
            razon: horaProgramado <= ahora ? 'Hora ya pasó' : 'Otro motivo'
          });
        }
      } catch (error) {
        console.error('❌ Error procesando programado:', prog, error);
      }
    }

    console.log('✅ Programados procesados:', {
      totalEncontrados: programados.length,
      totalHoy: programadosHoy.length,
      disponibles: programadosDisponibles.length,
      asignados: programadosAsignadosList.length,
      fechaHoy
    });

    return NextResponse.json({
      success: true,
      programadosDisponibles,
      programadosAsignados: programadosAsignadosList,
      estadisticas: {
        totalProgramados: programadosHoy.length,
        disponibles: programadosDisponibles.length,
        asignados: programadosAsignadosList.length,
        fechaHoy
      },
      debug: TimeService.getDebugInfo()
    });

  } catch (error) {
    console.error('❌ Error obteniendo programados:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  } finally {
    await prismaWithRetry.$disconnect();
  }
}
