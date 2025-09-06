import { prisma } from './prisma';
import { TimeService } from './timeService';

export interface ValidacionResult {
  tienePlanilla: boolean;
  planilla?: {
    id: number;
    fecha: Date;
    activo: boolean;
  };
  tieneListaChequeo: boolean;
  listaChequeo?: {
    id: number;
    fecha: Date;
    items: string;
  };
  licenciaConduccionVencida: boolean;
  licenciaConduccion?: {
    fechaVencimiento: Date;
  };
  documentosVencidos: Array<{
    tipo: string;
    fechaVencimiento: Date;
  }>;
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
   * Convierte una fecha a cadena YYYY-MM-DD asumiendo zona America/Bogota (UTC-5, sin DST)
   */
  private static toYYYYMMDDBogota(date: Date): string {
    const utcMs = date.getTime();
    const bogotaOffsetMs = 5 * 60 * 60 * 1000; // UTC-5
    const adjusted = new Date(utcMs - bogotaOffsetMs);
    const y = adjusted.getUTCFullYear();
    const m = (adjusted.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = adjusted.getUTCDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
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
               include: { ruta: true, automovil: true }
     });

     // Verificar conflictos de tiempo (margen de 30 minutos)
     const margenMinutos = 30;
     for (const turno of turnosExistentes) {
       const diferencia = Math.abs(horaSalida.getTime() - turno.horaSalida.getTime()) / (1000 * 60);
       if (diferencia < margenMinutos) {
         const movilNombre = turno.automovil?.movil || 'Móvil desconocido';
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

    console.log('🔍 Validando planilla:', {
      movilId,
      ahora: ahora.toISOString(),
      inicioDia: inicioDia.toISOString(),
      finDia: finDia.toISOString()
    });

    // Buscar planillas directamente por automovilId y fecha
    const planilla = await prisma.planilla.findFirst({
      where: {
        automovilId: movilId,
        fecha: {
          gte: inicioDia,
          lt: finDia
        }
      }
    });

    // Debug: Buscar TODAS las planillas para este móvil para comparar
    const todasLasPlanillas = await prisma.planilla.findMany({
      where: {
        automovilId: movilId
      },
      orderBy: {
        fecha: 'desc'
      },
      take: 5 // Solo las últimas 5
    });

    console.log('🔍 DEBUG - Todas las planillas recientes para móvil', movilId, ':', 
      todasLasPlanillas.map(p => ({
        id: p.id,
        fecha: p.fecha.toISOString(),
        fechaLocal: p.fecha.toLocaleDateString('es-ES'),
        automovilId: p.automovilId
      }))
    );

    if (planilla) {
      console.log('✅ Planilla encontrada:', {
        id: planilla.id,
        fecha: planilla.fecha,
        automovilId: planilla.automovilId
      });
      
      return {
        tienePlanilla: true,
        planilla: {
          id: planilla.id,
          fecha: new Date(planilla.fecha),
          activo: true // Las planillas siempre están activas si existen
        }
      };
    }

    console.log('❌ No se encontró planilla para el día actual');
    return { tienePlanilla: false };
  }

  /**
   * Valida si un móvil tiene lista de chequeo para el día actual
   */
  static async validarListaChequeo(movilId: number): Promise<{ tieneListaChequeo: boolean; listaChequeo?: { id: number; fecha: Date; items: string } }> {
    const ahora = TimeService.getCurrentTime();

    // Obtener el último registro y comparar solo por FECHA (día), ignorando la hora
    const ultimo = await prisma.listaChequeo.findFirst({
      where: { automovilId: movilId },
      orderBy: { fecha: 'desc' }
    });

    if (ultimo) {
      // Normalizar a YYYY-MM-DD en zona Bogota para evitar diferencias de entorno (Vercel/Local)
      const hoyStr = ValidacionService.toYYYYMMDDBogota(ahora);
      const regStr = ValidacionService.toYYYYMMDDBogota(new Date(ultimo.fecha));

      const esDeHoy = hoyStr === regStr;

      console.log('🔍 Comparación lista chequeo por fecha (solo día):', { hoyStr, regStr, esDeHoy });

      if (esDeHoy) {
        return {
          tieneListaChequeo: true,
          listaChequeo: {
            id: ultimo.id,
            fecha: new Date(ultimo.fecha),
            items: ultimo.items
          }
        };
      }
    }

    console.log('❌ No se encontró lista de chequeo para el día actual');
    return { tieneListaChequeo: false };
  }

  /**
   * Valida si la licencia de conducción del conductor está vencida
   */
  static async validarLicenciaConduccion(conductorId: number): Promise<{ licenciaConduccionVencida: boolean; licenciaConduccion?: { fechaVencimiento: Date } }> {
    const conductor = await prisma.conductor.findUnique({
      where: { id: conductorId },
      select: { licenciaConduccion: true }
    });

    if (!conductor || !conductor.licenciaConduccion) {
      console.log('❌ Conductor no encontrado o sin licencia de conducción');
      return {
        licenciaConduccionVencida: true // Si no tiene fecha, considerar vencida
      };
    }

    const ahora = TimeService.getCurrentTime();
    const fechaVencimiento = new Date(conductor.licenciaConduccion);
    const vencida = fechaVencimiento < ahora;

    console.log('🔍 Validando licencia de conducción:', {
      conductorId,
      fechaVencimiento: fechaVencimiento.toISOString(),
      ahora: ahora.toISOString(),
      vencida
    });

    if (vencida) {
      console.log('❌ Licencia de conducción vencida');
      return {
        licenciaConduccionVencida: true,
        licenciaConduccion: {
          fechaVencimiento
        }
      };
    }

    console.log('✅ Licencia de conducción válida');
    return {
      licenciaConduccionVencida: false,
      licenciaConduccion: {
        fechaVencimiento
      }
    };
  }

  /**
   * Valida si el móvil tiene documentos vencidos
   */
  static async validarDocumentosMovil(movilId: number): Promise<{ documentosVencidos: Array<{ tipo: string; fechaVencimiento: Date }> }> {
    const automovil = await prisma.automovil.findUnique({
      where: { id: movilId },
      select: {
        soat: true,
        revisionTecnomecanica: true,
        tarjetaOperacion: true,
        licenciaTransito: true,
        extintor: true,
        revisionPreventiva: true
      }
    });

    if (!automovil) {
      console.log('❌ Automóvil no encontrado');
      return { documentosVencidos: [] };
    }

    const ahora = TimeService.getCurrentTime();
    const documentosVencidos: Array<{ tipo: string; fechaVencimiento: Date }> = [];

    console.log('🔍 Validando documentos del móvil:', {
      movilId,
      ahora: ahora.toISOString()
    });

    // Validar SOAT
    if (automovil.soat && new Date(automovil.soat) < ahora) {
      documentosVencidos.push({
        tipo: 'SOAT',
        fechaVencimiento: new Date(automovil.soat)
      });
    }

    // Validar Revisión Técnico Mecánica
    if (automovil.revisionTecnomecanica && new Date(automovil.revisionTecnomecanica) < ahora) {
      documentosVencidos.push({
        tipo: 'Revisión Técnico Mecánica',
        fechaVencimiento: new Date(automovil.revisionTecnomecanica)
      });
    }

    // Validar Tarjeta de Operación
    if (automovil.tarjetaOperacion && new Date(automovil.tarjetaOperacion) < ahora) {
      documentosVencidos.push({
        tipo: 'Tarjeta de Operación',
        fechaVencimiento: new Date(automovil.tarjetaOperacion)
      });
    }

    // Validar Licencia de Tránsito
    if (automovil.licenciaTransito && new Date(automovil.licenciaTransito) < ahora) {
      documentosVencidos.push({
        tipo: 'Licencia de Tránsito',
        fechaVencimiento: new Date(automovil.licenciaTransito)
      });
    }

    // Validar Extintor
    if (automovil.extintor && new Date(automovil.extintor) < ahora) {
      documentosVencidos.push({
        tipo: 'Extintor',
        fechaVencimiento: new Date(automovil.extintor)
      });
    }

    // Validar Revisión Preventiva - DESHABILITADO POR SOLICITUD DEL USUARIO
    // if (automovil.revisionPreventiva && new Date(automovil.revisionPreventiva) < ahora) {
    //   documentosVencidos.push({
    //     tipo: 'Revisión Preventiva',
    //     fechaVencimiento: new Date(automovil.revisionPreventiva)
    //   });
    // }



    console.log('📋 Documentos vencidos encontrados:', documentosVencidos.length);
    return { documentosVencidos };
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

    // Obtener sanciones del automóvil que intersecten el día actual
    const sanciones = await prisma.sancionAutomovil.findMany({
      where: {
        automovilId: movilId,
        AND: [
          { fechaInicio: { lte: finDia } },
          { fechaFin: { gte: inicioDia } }
        ]
      },
      orderBy: {
        fechaInicio: 'asc'
      }
    });

    console.log('🔍 Sanciones automóvil encontradas:', sanciones.map(s => ({
      id: s.id,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin,
      descripcion: s.descripcion
    })));

    return sanciones.map(sancion => ({
      id: sancion.id,
      fechaInicio: new Date(sancion.fechaInicio),
      fechaFin: new Date(sancion.fechaFin),
      motivo: sancion.descripcion
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

    // Obtener sanciones del conductor para el día actual
    const sanciones = await prisma.sancionConductor.findMany({
      where: {
        conductorId,
        AND: [
          { fechaInicio: { lte: finDia } },
          { fechaFin: { gte: inicioDia } }
        ]
      },
      orderBy: {
        fechaInicio: 'asc'
      }
    });

    console.log('🔍 Sanciones conductor encontradas:', sanciones.map(s => ({
      id: s.id,
      fechaInicio: s.fechaInicio,
      fechaFin: s.fechaFin,
      descripcion: s.descripcion
    })));

    return sanciones.map(sancion => ({
      id: sancion.id,
      fechaInicio: new Date(sancion.fechaInicio),
      fechaFin: new Date(sancion.fechaFin),
      motivo: sancion.descripcion
    }));
  }

  /**
   * Realiza todas las validaciones para un móvil y conductor
   */
  static async validarCompleta(movilId: number, conductorId: number): Promise<ValidacionResult> {
    const [validacionPlanilla, validacionListaChequeo, validacionLicencia, validacionDocumentos, sancionesAutomovil, sancionesConductor] = await Promise.all([
      this.validarPlanilla(movilId),
      this.validarListaChequeo(movilId),
      this.validarLicenciaConduccion(conductorId),
      this.validarDocumentosMovil(movilId),
      this.validarSancionesAutomovil(movilId),
      this.validarSancionesConductor(conductorId)
    ]);

    return {
      tienePlanilla: validacionPlanilla.tienePlanilla,
      planilla: validacionPlanilla.planilla,
      tieneListaChequeo: validacionListaChequeo.tieneListaChequeo,
      listaChequeo: validacionListaChequeo.listaChequeo,
      licenciaConduccionVencida: validacionLicencia.licenciaConduccionVencida,
      licenciaConduccion: validacionLicencia.licenciaConduccion,
      documentosVencidos: validacionDocumentos.documentosVencidos,
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