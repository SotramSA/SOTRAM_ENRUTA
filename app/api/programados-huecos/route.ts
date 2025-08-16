import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
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
    const programados = await prisma.programacion.findMany({
      include: {
        movil: true,
        usuario: true
      },
      orderBy: { hora: 'asc' }
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
        ruta: p.ruta,
        hora: p.hora,
        disponible: p.disponible,
        movilId: p.movilId
      }))
    });

    // Mostrar estadísticas de disponibilidad
    const disponibles = programadosHoy.filter(p => p.disponible);
    const asignados = programadosHoy.filter(p => !p.disponible);
    
    console.log('📊 Estadísticas de disponibilidad:', {
      totalHoy: programadosHoy.length,
      disponibles: disponibles.length,
      asignados: asignados.length,
      disponiblesDetalle: disponibles.map(p => ({
        id: p.id,
        ruta: p.ruta,
        hora: p.hora,
        movilId: p.movilId
      }))
    });

    // Separar programados disponibles y asignados
    const programadosDisponibles = [];
    const programadosAsignados = [];

    for (const prog of programadosHoy) {
      try {
        // Convertir la hora del programado a Date usando la fecha del programado
        let horaProgramado: Date;
        
        if (typeof prog.hora === 'string') {
          // Si viene como ISO string
          if (prog.hora.includes('T')) {
            // Extraer solo la hora (HH:MM) del ISO string
            const horaISO = new Date(prog.hora);
            const horas = horaISO.getUTCHours();
            const minutos = horaISO.getUTCMinutes();
            
            // Usar la fecha del programado (no la fecha actual)
            const fechaProgramado = new Date(prog.fecha);
            horaProgramado = new Date(fechaProgramado);
            horaProgramado.setHours(horas, minutos, 0, 0);
          } else {
            // Si viene como HH:MM, usar la fecha del programado
            const [horas, minutos] = prog.hora.split(':').map(Number);
            const fechaProgramado = new Date(prog.fecha);
            horaProgramado = new Date(fechaProgramado);
            horaProgramado.setHours(horas, minutos, 0, 0);
          }
        } else {
          // Si es un Date, extraer la hora y usar la fecha del programado
          const horaDate = new Date(prog.hora);
          const horas = horaDate.getHours();
          const minutos = horaDate.getMinutes();
          
          const fechaProgramado = new Date(prog.fecha);
          horaProgramado = new Date(fechaProgramado);
          horaProgramado.setHours(horas, minutos, 0, 0);
        }

        console.log(`🔍 Evaluando programado para huecos: ${prog.ruta}`, {
          id: prog.id,
          disponible: prog.disponible,
          horaProgramado: horaProgramado.toISOString(),
          ahora: ahora.toISOString(),
          estaEnFuturo: horaProgramado > ahora,
          movilId: prog.movilId
        });

        // Verificar consistencia: si tiene movilId asignado, no debería estar disponible
        const esRealmenteDisponible = prog.disponible && (!prog.movilId || prog.movilId === -1);
        
        console.log(`🔍 Verificando disponibilidad real: ${prog.ruta}`, {
          id: prog.id,
          disponible: prog.disponible,
          movilId: prog.movilId,
          esRealmenteDisponible,
          horaProgramado: horaProgramado.toISOString(),
          ahora: ahora.toISOString(),
          estaEnFuturo: horaProgramado > ahora
        });

        if (esRealmenteDisponible && horaProgramado > ahora) {
          const hueco = {
            rutaId: 0, // Los programados no tienen rutaId
            rutaNombre: prog.ruta,
            horaSalida: horaProgramado.toISOString(),
            prioridad: 'CUALQUIERA' as const,
            razon: `Programado disponible (${Math.round((horaProgramado.getTime() - ahora.getTime()) / (1000 * 60))} min)`,
            frecuenciaCalculada: 0,
            programadoId: prog.id, // Agregar ID del programado para identificación
            tipo: 'programado'
          };
          
          programadosDisponibles.push(hueco);
          console.log(`✅ Programado agregado como hueco disponible:`, hueco);
        } else if (!prog.disponible) {
          // Programado ya asignado
          programadosAsignados.push({
            id: prog.id,
            tipo: 'programado',
            horaSalida: horaProgramado.toISOString(),
            ruta: { 
              id: 0,
              nombre: prog.ruta 
            },
            movil: { 
              id: prog.movil.id, 
              movil: prog.movil.movil 
            },
            conductor: { 
              id: 0,
              nombre: 'Programado' 
            },
            estado: 'PROGRAMADO'
          });
        } else {
          let razon = '';
          if (!esRealmenteDisponible) {
            if (!prog.disponible) {
              razon = 'No disponible (disponible=false)';
            } else if (prog.movilId) {
              razon = 'Ya asignado (tiene movilId)';
            }
          } else if (horaProgramado <= ahora) {
            razon = 'Hora ya pasó';
          }
          
          console.log(`❌ Programado NO incluido como hueco:`, {
            ruta: prog.ruta,
            disponible: prog.disponible,
            movilId: prog.movilId,
            esRealmenteDisponible,
            estaEnFuturo: horaProgramado > ahora,
            razon
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
      asignados: programadosAsignados.length,
      fechaHoy
    });

    return NextResponse.json({
      success: true,
      programadosDisponibles,
      programadosAsignados,
      estadisticas: {
        totalProgramados: programadosHoy.length,
        disponibles: programadosDisponibles.length,
        asignados: programadosAsignados.length,
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
  }
}
