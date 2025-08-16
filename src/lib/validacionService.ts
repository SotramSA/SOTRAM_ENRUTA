import { prisma } from './prisma';
import { TimeService } from './timeService';

export interface ValidacionResult {
  tienePlanilla: boolean;
  planilla?: {
    id: number;
    fecha: Date;
    activo: boolean;
  };
  sancionesAutomovil: Array<{
    id: number;
    fechaInicio: Date;
    fechaFin: Date;
    motivo: string;
  }>;
  sancionesConductor: Array<{
    id: number;
    fechaInicio: Date;
    fechaFin: Date;
    motivo: string;
  }>;
  tieneSanciones: boolean;
}

export class ValidacionService {
  /**
   * Valida que un móvil esté disponible para un turno
   */
  static async validarMovilDisponible(movilId: number, fecha: Date): Promise<{ valido: boolean; error?: string }> {
    const movil = await prisma.automovil.findUnique({
      where: { id: movilId }
    });

    if (!movil) {
      return { valido: false, error: 'Móvil no encontrado' };
    }

    if (!movil.activo) {
      return { valido: false, error: 'Móvil no está activo' };
    }

    // Los móviles pueden hacer múltiples rutas en el mismo día
    // Solo se verificarán conflictos de tiempo en validarConflictosHorarios
    return { valido: true };
  }

  /**
   * Valida que un conductor esté disponible para un turno
   */
  static async validarConductorDisponible(conductorId: number, fecha: Date): Promise<{ valido: boolean; error?: string }> {
    const conductor = await prisma.conductor.findUnique({
      where: { id: conductorId }
    });

    if (!conductor) {
      return { valido: false, error: 'Conductor no encontrado' };
    }

    if (!conductor.activo) {
      return { valido: false, error: 'Conductor no está activo' };
    }

    // Los conductores pueden hacer múltiples rutas en el mismo día
    // Solo se verificarán conflictos de tiempo en validarConflictosHorarios
    return { valido: true };
  }

  /**
   * Valida que una ruta esté disponible para un conductor
   */
  static async validarRutaDisponible(rutaId: number, conductorId: number, fecha: Date): Promise<{ valido: boolean; error?: string }> {
    const ruta = await prisma.ruta.findUnique({
      where: { id: rutaId }
    });

    if (!ruta) {
      return { valido: false, error: 'Ruta no encontrada' };
    }

    if (!ruta.activo) {
      return { valido: false, error: 'Ruta no está activa' };
    }

    // Si la ruta es unaVezDia, verificar que el conductor no la haya hecho hoy
    if (ruta.unaVezDia) {
      const turnoHoy = await prisma.turno.findFirst({
        where: {
          conductorId,
          rutaId,
          fecha: {
            gte: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
            lt: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1)
          }
        }
      });

      if (turnoHoy) {
        return { valido: false, error: `Conductor ya realizó la ruta ${ruta.nombre} hoy` };
      }
    }

    return { valido: true };
  }

  /**
   * Valida que la hora de salida sea válida
   */
  static validarHoraSalida(horaSalida: Date): { valido: boolean; error?: string } {
    const ahora = TimeService.getCurrentTime();
    
    if (horaSalida <= ahora) {
      return { valido: false, error: 'La hora de salida no puede ser en el pasado' };
    }

    // Verificar que no sea más de 24 horas en el futuro
    const maxHora = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    if (horaSalida > maxHora) {
      return { valido: false, error: 'La hora de salida no puede ser más de 24 horas en el futuro' };
    }

    return { valido: true };
  }

  /**
   * Valida que no haya conflictos de horarios
   */
  static async validarConflictosHorarios(
    movilId: number, 
    conductorId: number, 
    rutaId: number, 
    horaSalida: Date
  ): Promise<{ valido: boolean; error?: string }> {
    const ahora = TimeService.getCurrentTime();
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

         // Obtener turnos existentes para el móvil y conductor en la misma fecha
     const turnosExistentes = await prisma.turno.findMany({
       where: {
         OR: [
           { movilId, fecha: { gte: fecha, lt: new Date(fecha.getTime() + 24 * 60 * 60 * 1000) } },
           { conductorId, fecha: { gte: fecha, lt: new Date(fecha.getTime() + 24 * 60 * 60 * 1000) } }
         ]
       },
       include: { ruta: true, movil: true }
     });

     // Verificar conflictos de tiempo (margen de 30 minutos)
     const margenMinutos = 30;
     for (const turno of turnosExistentes) {
       const diferencia = Math.abs(horaSalida.getTime() - turno.horaSalida.getTime()) / (1000 * 60);
       if (diferencia < margenMinutos) {
         const movilNombre = turno.movil?.movil || 'Móvil desconocido';
         return { 
           valido: false, 
           error: `Conflicto de horario: ${movilNombre} ya tiene un turno a las ${turno.horaSalida.toLocaleTimeString()}` 
         };
       }
     }

    return { valido: true };
  }

  /**
   * Valida si un móvil tiene planilla para el día actual
   */
  static async validarPlanilla(movilId: number): Promise<{ tienePlanilla: boolean; planilla?: { id: number; fecha: Date; activo: boolean } }> {
    const ahora = TimeService.getCurrentTime();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const planilla = await prisma.planilla.findFirst({
      where: {
        movilId,
        fecha: {
          gte: inicioDia,
          lt: finDia
        },
        activo: true
      }
    });

    if (planilla) {
      return {
        tienePlanilla: true,
        planilla: {
          id: planilla.id,
          fecha: new Date(planilla.fecha),
          activo: planilla.activo
        }
      };
    }

    return { tienePlanilla: false };
  }

  /**
   * Valida si un móvil tiene sanciones activas para el día actual
   */
  static async validarSancionesAutomovil(movilId: number): Promise<Array<{
    id: number;
    fechaInicio: Date;
    fechaFin: Date;
    motivo: string;
  }>> {
    const ahora = TimeService.getCurrentTime();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    console.log('🔍 Validando sanciones automóvil:', {
      movilId,
      ahora: ahora.toISOString(),
      inicioDia: inicioDia.toISOString(),
      finDia: finDia.toISOString()
    });

    // Primero, obtener todas las sanciones del automóvil para debugging
    const todasLasSanciones = await prisma.sancionAutomovil.findMany({
      where: {
        automovilId: movilId
      },
      orderBy: {
        fechaInicio: 'asc'
      }
    });

    console.log('🔍 Todas las sanciones del automóvil:', todasLasSanciones.map(s => ({
      id: s.id,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin,
      motivo: s.motivo,
      fechaInicioISO: s.fechaInicio.toISOString(),
      fechaFinISO: s.fechaFin.toISOString(),
      esUnDia: s.fechaInicio.getTime() === s.fechaFin.getTime()
    })));

    // Filtrar las sanciones que están activas hoy
    const sanciones = todasLasSanciones.filter(sancion => {
      const fechaInicio = new Date(sancion.fechaInicio);
      const fechaFin = new Date(sancion.fechaFin);
      
      console.log('🔍 DEBUG - Sanción original:', {
        id: sancion.id,
        motivo: sancion.motivo,
        fechaInicioOriginal: sancion.fechaInicio,
        fechaFinOriginal: sancion.fechaFin,
        fechaInicioISO: sancion.fechaInicio.toISOString(),
        fechaFinISO: sancion.fechaFin.toISOString()
      });
      
      console.log('🔍 DEBUG - Fechas convertidas:', {
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        fechaInicioTime: fechaInicio.getTime(),
        fechaFinTime: fechaFin.getTime()
      });
      
      // Verificar si la sanción está activa hoy
      const comienzaHoy = fechaInicio >= inicioDia && fechaInicio < finDia;
      const terminaHoy = fechaFin >= inicioDia && fechaFin < finDia;
      const abarcaHoy = fechaInicio < finDia && fechaFin >= inicioDia;
      
      console.log('🔍 DEBUG - Rangos de día:', {
        inicioDia: inicioDia.toISOString(),
        finDia: finDia.toISOString(),
        comienzaHoy,
        terminaHoy,
        abarcaHoy
      });
      
             // Para sanciones de un solo día, verificar si la fecha coincide exactamente con hoy
       // Comparar solo las fechas (sin horas) para detectar sanciones de un solo día
       // Usar UTC para evitar problemas de zona horaria
       const fechaInicioSolo = new Date(Date.UTC(fechaInicio.getUTCFullYear(), fechaInicio.getUTCMonth(), fechaInicio.getUTCDate()));
       const fechaFinSolo = new Date(Date.UTC(fechaFin.getUTCFullYear(), fechaFin.getUTCMonth(), fechaFin.getUTCDate()));
       const inicioDiaUTC = new Date(Date.UTC(inicioDia.getUTCFullYear(), inicioDia.getUTCMonth(), inicioDia.getUTCDate()));
       const esUnDia = fechaInicioSolo.getTime() === fechaFinSolo.getTime();
       const esHoy = fechaInicioSolo.getTime() === inicioDiaUTC.getTime();
       const sancionUnDiaHoy = esUnDia && esHoy;
       
       console.log('🔍 DEBUG - Comparación de fechas solo:', {
         fechaInicioSolo: fechaInicioSolo.toISOString(),
         fechaFinSolo: fechaFinSolo.toISOString(),
         fechaInicioSoloTime: fechaInicioSolo.getTime(),
         fechaFinSoloTime: fechaFinSolo.getTime(),
         inicioDiaUTC: inicioDiaUTC.toISOString(),
         inicioDiaUTCTime: inicioDiaUTC.getTime(),
         esUnDia,
         esHoy,
         sancionUnDiaHoy
       });
      
      const estaActiva = comienzaHoy || terminaHoy || abarcaHoy || sancionUnDiaHoy;
      
      console.log('🔍 DEBUG - Resultado final:', {
        id: sancion.id,
        motivo: sancion.motivo,
        estaActiva,
        comienzaHoy,
        terminaHoy,
        abarcaHoy,
        sancionUnDiaHoy
      });
      
      return estaActiva;
    });

    console.log('🔍 Sanciones encontradas:', sanciones.map(s => ({
      id: s.id,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin,
      motivo: s.motivo,
      fechaInicioISO: s.fechaInicio.toISOString(),
      fechaFinISO: s.fechaFin.toISOString(),
      esUnDia: s.fechaInicio.getTime() === s.fechaFin.getTime()
    })));

    return sanciones.map(sancion => ({
      id: sancion.id,
      fechaInicio: new Date(sancion.fechaInicio),
      fechaFin: new Date(sancion.fechaFin),
      motivo: sancion.motivo
    }));
  }

  /**
   * Valida si un conductor tiene sanciones activas para el día actual
   */
  static async validarSancionesConductor(conductorId: number): Promise<Array<{
    id: number;
    fechaInicio: Date;
    fechaFin: Date;
    motivo: string;
  }>> {
    const ahora = TimeService.getCurrentTime();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    console.log('🔍 Validando sanciones conductor:', {
      conductorId,
      ahora: ahora.toISOString(),
      inicioDia: inicioDia.toISOString(),
      finDia: finDia.toISOString()
    });

    // Primero, obtener todas las sanciones del conductor para debugging
    const todasLasSanciones = await prisma.sancionConductor.findMany({
      where: {
        conductorId
      },
      orderBy: {
        fechaInicio: 'asc'
      }
    });

    console.log('🔍 Todas las sanciones del conductor:', todasLasSanciones.map(s => ({
      id: s.id,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin,
      motivo: s.motivo,
      fechaInicioISO: s.fechaInicio.toISOString(),
      fechaFinISO: s.fechaFin.toISOString(),
      esUnDia: s.fechaInicio.getTime() === s.fechaFin.getTime()
    })));

    // Filtrar las sanciones que están activas hoy
    const sanciones = todasLasSanciones.filter(sancion => {
      const fechaInicio = new Date(sancion.fechaInicio);
      const fechaFin = new Date(sancion.fechaFin);
      
      console.log('🔍 DEBUG CONDUCTOR - Sanción original:', {
        id: sancion.id,
        motivo: sancion.motivo,
        fechaInicioOriginal: sancion.fechaInicio,
        fechaFinOriginal: sancion.fechaFin,
        fechaInicioISO: sancion.fechaInicio.toISOString(),
        fechaFinISO: sancion.fechaFin.toISOString()
      });
      
      console.log('🔍 DEBUG CONDUCTOR - Fechas convertidas:', {
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        fechaInicioTime: fechaInicio.getTime(),
        fechaFinTime: fechaFin.getTime()
      });
      
      // Verificar si la sanción está activa hoy
      const comienzaHoy = fechaInicio >= inicioDia && fechaInicio < finDia;
      const terminaHoy = fechaFin >= inicioDia && fechaFin < finDia;
      const abarcaHoy = fechaInicio < finDia && fechaFin >= inicioDia;
      
      console.log('🔍 DEBUG CONDUCTOR - Rangos de día:', {
        inicioDia: inicioDia.toISOString(),
        finDia: finDia.toISOString(),
        comienzaHoy,
        terminaHoy,
        abarcaHoy
      });
      
             // Para sanciones de un solo día, verificar si la fecha coincide exactamente con hoy
       // Comparar solo las fechas (sin horas) para detectar sanciones de un solo día
       // Usar UTC para evitar problemas de zona horaria
       const fechaInicioSolo = new Date(Date.UTC(fechaInicio.getUTCFullYear(), fechaInicio.getUTCMonth(), fechaInicio.getUTCDate()));
       const fechaFinSolo = new Date(Date.UTC(fechaFin.getUTCFullYear(), fechaFin.getUTCMonth(), fechaFin.getUTCDate()));
       const inicioDiaUTC = new Date(Date.UTC(inicioDia.getUTCFullYear(), inicioDia.getUTCMonth(), inicioDia.getUTCDate()));
       const esUnDia = fechaInicioSolo.getTime() === fechaFinSolo.getTime();
       const esHoy = fechaInicioSolo.getTime() === inicioDiaUTC.getTime();
       const sancionUnDiaHoy = esUnDia && esHoy;
      
             console.log('🔍 DEBUG CONDUCTOR - Comparación de fechas solo:', {
         fechaInicioSolo: fechaInicioSolo.toISOString(),
         fechaFinSolo: fechaFinSolo.toISOString(),
         fechaInicioSoloTime: fechaInicioSolo.getTime(),
         fechaFinSoloTime: fechaFinSolo.getTime(),
         inicioDiaUTC: inicioDiaUTC.toISOString(),
         inicioDiaUTCTime: inicioDiaUTC.getTime(),
         esUnDia,
         esHoy,
         sancionUnDiaHoy
       });
      
      const estaActiva = comienzaHoy || terminaHoy || abarcaHoy || sancionUnDiaHoy;
      
      console.log('🔍 DEBUG CONDUCTOR - Resultado final:', {
        id: sancion.id,
        motivo: sancion.motivo,
        estaActiva,
        comienzaHoy,
        terminaHoy,
        abarcaHoy,
        sancionUnDiaHoy
      });
      
      return estaActiva;
    });

    console.log('🔍 Sanciones conductor encontradas:', sanciones.map(s => ({
      id: s.id,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin,
      motivo: s.motivo,
      fechaInicioISO: s.fechaInicio.toISOString(),
      fechaFinISO: s.fechaFin.toISOString(),
      esUnDia: s.fechaInicio.getTime() === s.fechaFin.getTime()
    })));

    return sanciones.map(sancion => ({
      id: sancion.id,
      fechaInicio: new Date(sancion.fechaInicio),
      fechaFin: new Date(sancion.fechaFin),
      motivo: sancion.motivo
    }));
  }

  /**
   * Realiza todas las validaciones para un móvil y conductor
   */
  static async validarCompleta(movilId: number, conductorId: number): Promise<ValidacionResult> {
    const [validacionPlanilla, sancionesAutomovil, sancionesConductor] = await Promise.all([
      this.validarPlanilla(movilId),
      this.validarSancionesAutomovil(movilId),
      this.validarSancionesConductor(conductorId)
    ]);

    return {
      tienePlanilla: validacionPlanilla.tienePlanilla,
      planilla: validacionPlanilla.planilla,
      sancionesAutomovil,
      sancionesConductor,
      tieneSanciones: sancionesAutomovil.length > 0 || sancionesConductor.length > 0
    };
  }

  /**
   * Valida todas las reglas de negocio para crear un turno
   */
  static async validarCreacionTurno(
    movilId: number, 
    conductorId: number, 
    rutaId: number, 
    horaSalida: Date
  ): Promise<{ valido: boolean; error?: string }> {
    const ahora = TimeService.getCurrentTime();

    // Validar móvil
    const validacionMovil = await this.validarMovilDisponible(movilId, ahora);
    if (!validacionMovil.valido) {
      return validacionMovil;
    }

    // Validar conductor
    const validacionConductor = await this.validarConductorDisponible(conductorId, ahora);
    if (!validacionConductor.valido) {
      return validacionConductor;
    }

    // Validar ruta
    const validacionRuta = await this.validarRutaDisponible(rutaId, conductorId, ahora);
    if (!validacionRuta.valido) {
      return validacionRuta;
    }

    // Validar hora de salida
    const validacionHora = this.validarHoraSalida(horaSalida);
    if (!validacionHora.valido) {
      return validacionHora;
    }

    // Validar conflictos de horarios
    const validacionConflictos = await this.validarConflictosHorarios(movilId, conductorId, rutaId, horaSalida);
    if (!validacionConflictos.valido) {
      return validacionConflictos;
    }

    return { valido: true };
  }

  /**
   * Valida que un hueco esté disponible
   */
  static async validarHuecoDisponible(
    rutaId: number, 
    horaSalida: Date
  ): Promise<{ valido: boolean; error?: string }> {
    const ahora = TimeService.getCurrentTime();
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    // Verificar si ya hay un turno asignado para ese hueco
    const turnoExistente = await prisma.turno.findFirst({
      where: {
        rutaId,
        fecha: { gte: fecha, lt: new Date(fecha.getTime() + 24 * 60 * 60 * 1000) },
        horaSalida: {
          gte: new Date(horaSalida.getTime() - 5 * 60 * 1000), // 5 minutos antes
          lte: new Date(horaSalida.getTime() + 5 * 60 * 1000)  // 5 minutos después
        }
      }
    });

    if (turnoExistente) {
      return { valido: false, error: 'Este hueco ya está ocupado' };
    }

    return { valido: true };
  }

  /**
   * Formatea una fecha para mostrar en mensajes
   */
  static formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Verifica si una sanción es de un solo día
   */
  static esSancionUnDia(fechaInicio: Date, fechaFin: Date): boolean {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    // Resetear las horas para comparar solo las fechas
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    
    return inicio.getTime() === fin.getTime();
  }
} 