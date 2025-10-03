import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { TimeService } from '@/src/lib/timeService';

export async function GET(request: NextRequest) {
  try {
    TimeService.setFromHeaders(request.headers);
    const ahora = TimeService.getCurrentTime();
    
    // Obtener fecha actual del sistema (UTC para comparar con fechas de DB)
    const year = ahora.getUTCFullYear();
    const month = String(ahora.getUTCMonth() + 1).padStart(2, '0');
    const day = String(ahora.getUTCDate()).padStart(2, '0');
    const fechaHoy = `${year}-${month}-${day}`;




    // Obtener todos los turnos
    const todosTurnos = await prisma.turno.findMany({
      include: {
        ruta: true,
        automovil: true,
        conductor: true
      },
      orderBy: { horaSalida: 'asc' }
    });

    // Filtrar turnos de hoy comparando la fecha ISO sin zona horaria
    const turnosHoy = todosTurnos.filter(turno => {
      // Usar toISOString().split('T')[0] para obtener solo la fecha sin zona horaria
      const fechaTurno = turno.fecha.toISOString().split('T')[0];
      return fechaTurno === fechaHoy;
    });

    // Obtener todos los programados
    const todosProgramados = await prisma.programacion.findMany({
      include: {
        automovil: true,
        ruta: true
      },
      orderBy: { hora: 'asc' }
    });

    // Filtrar programados por fecha de hoy comparando con fecha ISO
    const programadosHoy = todosProgramados.filter(prog => {
      // Usar toISOString().split('T')[0] para obtener la fecha en formato ISO
      const fechaProgramado = prog.fecha.toISOString().split('T')[0];
      const coincide = fechaProgramado === fechaHoy;
      
      // Log detallado para debug
      // Debug reducido eliminado
      
      return coincide;
    });


    // Convertir turnos al formato esperado
    const turnosFormateados = turnosHoy.map(turno => ({
      id: turno.id,
      tipo: 'turno' as const,
      horaSalida: turno.horaSalida.toISOString(),
      ruta: turno.ruta ? { 
        id: turno.ruta.id, 
        nombre: turno.ruta.nombre 
      } : null,
      movil: { 
        id: turno.automovil.id, 
        movil: turno.automovil.movil 
      },
      conductor: { 
        id: turno.conductor.id, 
        nombre: turno.conductor.nombre 
      },
      estado: turno.estado || 'PENDIENTE'
    }));

    // Convertir programados al formato esperado
    const programadosFormateados = programadosHoy.map(prog => {
      try {
        let horaSalidaISO: string;
        
        if (typeof prog.hora === 'number') {
          const horas = Math.floor(prog.hora / 100);
          const minutos = prog.hora % 100;
          
          // Validar que las horas y minutos sean válidos
          if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
            console.warn(`⚠️ Hora inválida en programación ${prog.id}: ${prog.hora}`);
            // Usar hora por defecto con fecha ISO
            const fechaISO = prog.fecha.toISOString().split('T')[0];
            horaSalidaISO = `${fechaISO}T00:00:00.000Z`;
          } else {
            // Usar la fecha ISO directamente para evitar conversiones de zona horaria
            // Usar la fecha local directamente
            const fechaISO = prog.fecha.toISOString().split('T')[0];
            const horaFormateada = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00.000Z`;
            horaSalidaISO = `${fechaISO}T${horaFormateada}`;
          }
        } else if (typeof prog.hora === 'string') {
          // Si es string, intentar parsearlo
          horaSalidaISO = prog.hora;
        } else if (prog.hora === null || prog.hora === undefined) {
          // Si es null, usar medianoche del día con fecha ISO
          const fechaISO = prog.fecha.toISOString().split('T')[0];
          horaSalidaISO = `${fechaISO}T00:00:00.000Z`;
          console.warn(`⚠️ Hora null en programación ${prog.id}, usando medianoche`);
        } else {
          // Fallback para otros tipos con fecha ISO
          console.warn(`⚠️ Tipo de hora desconocido en programación ${prog.id}:`, typeof prog.hora, prog.hora);
          const fechaISO = prog.fecha.toISOString().split('T')[0];
          horaSalidaISO = `${fechaISO}T00:00:00.000Z`;
        }

        return {
          id: prog.id,
          tipo: 'programado' as const,
          horaSalida: horaSalidaISO,
          ruta: { 
            id: prog.ruta?.id || 0,
            nombre: prog.ruta?.nombre || 'Sin ruta'
          },
          movil: { 
            id: prog.automovil?.id || 0, 
            movil: prog.automovil?.movil || 'Sin móvil'
          },
          conductor: { 
            id: 0, // Los programados no tienen conductor específico
            nombre: 'Programado' 
          },
          estado: 'PROGRAMADO'
        };
      } catch (error) {
        console.error(`❌ Error procesando programación ${prog.id}:`, error);
        // Retornar un objeto válido con valores por defecto
        const fechaProgramado = new Date(prog.fecha);
        return {
          id: prog.id,
          tipo: 'programado' as const,
          horaSalida: new Date(fechaProgramado.getFullYear(), fechaProgramado.getMonth(), fechaProgramado.getDate(), 0, 0, 0, 0).toISOString(),
          ruta: { 
            id: prog.ruta?.id || 0,
            nombre: prog.ruta?.nombre || 'Sin ruta'
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
        };
      }
    });

    // Combinar y ordenar por hora
    const todosLosEventos = [...turnosFormateados, ...programadosFormateados];
    
    // Ordenar por hora de salida
    todosLosEventos.sort((a, b) => {
      const horaA = new Date(a.horaSalida).getTime();
      const horaB = new Date(b.horaSalida).getTime();
      return horaA - horaB;
    });

    // Eventos ordenados preparados para respuesta

    return NextResponse.json({
      success: true,
      eventos: todosLosEventos,
              estadisticas: {
          totalEventos: todosLosEventos.length,
          turnos: turnosFormateados.length,
          programados: programadosFormateados.length,
          fechaHoy
        },
      debug: {
        ...TimeService.getDebugInfo(),
        fechaHoy,
        fechaUTC: `${day}/${month}/${year}`
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo turnos y programados:', error);
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
