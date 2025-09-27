import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { TimeService } from '@/src/lib/timeService';

export async function GET(request: NextRequest) {
  try {
    TimeService.setFromHeaders(request.headers);
    const ahora = TimeService.getCurrentTime();
    
    // Obtener solo la fecha de hoy (YYYY-MM-DD)
    const fechaHoy = ahora.toISOString().split('T')[0];

    console.log('🔍 Obteniendo turnos y programados del día:', {
      fechaHoy,
      ahoraCompleto: ahora.toISOString()
    });

    // Obtener todos los turnos
    const todosTurnos = await prisma.turno.findMany({
      include: {
        ruta: true,
        automovil: true,
        conductor: true
      },
      orderBy: { horaSalida: 'asc' }
    });

    // Filtrar turnos de hoy
    const turnos = todosTurnos.filter(turno => {
      const fechaTurno = new Date(turno.fecha).toISOString().split('T')[0];
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

    // Filtrar programados de hoy
    const programados = todosProgramados.filter(prog => {
      const fechaProgramado = new Date(prog.fecha).toISOString().split('T')[0];
      return fechaProgramado === fechaHoy;
    });

    console.log('📊 Datos obtenidos:', {
      totalTurnos: todosTurnos.length,
      turnosHoy: turnos.length,
      totalProgramados: todosProgramados.length,
      programadosHoy: programados.length,
      fechaHoy
    });

    // Convertir turnos al formato esperado
    const turnosFormateados = turnos.map(turno => ({
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
    const programadosFormateados = programados.map(prog => {
      try {
        let horaSalidaISO: string;
        
        if (typeof prog.hora === 'number') {
          const horas = Math.floor(prog.hora / 100);
          const minutos = prog.hora % 100;
          const fechaProgramado = new Date(prog.fecha);
          
          // Validar que las horas y minutos sean válidos
          if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
            console.warn(`⚠️ Hora inválida en programación ${prog.id}: ${prog.hora}`);
            // Usar hora por defecto
            horaSalidaISO = new Date(fechaProgramado.getFullYear(), fechaProgramado.getMonth(), fechaProgramado.getDate(), 0, 0, 0, 0).toISOString();
          } else {
            // Crear la fecha usando componentes para evitar conversiones de zona horaria
            const horaDate = new Date(
              fechaProgramado.getFullYear(),
              fechaProgramado.getMonth(),
              fechaProgramado.getDate(),
              horas,
              minutos,
              0,
              0
            );
            horaSalidaISO = horaDate.toISOString();
          }
        } else if (typeof prog.hora === 'string') {
          // Si es string, intentar parsearlo
          horaSalidaISO = prog.hora;
        } else if (prog.hora === null || prog.hora === undefined) {
          // Si es null, usar medianoche del día
          const fechaProgramado = new Date(prog.fecha);
          horaSalidaISO = new Date(fechaProgramado.getFullYear(), fechaProgramado.getMonth(), fechaProgramado.getDate(), 0, 0, 0, 0).toISOString();
          console.warn(`⚠️ Hora null en programación ${prog.id}, usando medianoche`);
        } else {
          // Fallback para otros tipos
          console.warn(`⚠️ Tipo de hora desconocido en programación ${prog.id}:`, typeof prog.hora, prog.hora);
          const fechaProgramado = new Date(prog.fecha);
          horaSalidaISO = new Date(fechaProgramado.getFullYear(), fechaProgramado.getMonth(), fechaProgramado.getDate(), 0, 0, 0, 0).toISOString();
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

    console.log('✅ Eventos ordenados:', {
      total: todosLosEventos.length,
      turnos: turnosFormateados.length,
      programados: programadosFormateados.length,
      primerosEventos: todosLosEventos.slice(0, 3).map(e => ({
        tipo: e.tipo,
        hora: e.horaSalida,
        ruta: e.ruta?.nombre
      }))
    });

    return NextResponse.json({
      success: true,
      eventos: todosLosEventos,
              estadisticas: {
          totalEventos: todosLosEventos.length,
          turnos: turnosFormateados.length,
          programados: programadosFormateados.length,
          fechaHoy
        },
      debug: TimeService.getDebugInfo()
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
