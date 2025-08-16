import { prisma } from './prisma';
import { TimeService } from './timeService';

export interface Turno {
  id: number;
  horaSalida: string;
  ruta: { id: number; nombre: string } | null;
  movil: { id: number; movil: string };
  conductor: { id: number; nombre: string };
  estado: string;
}

export interface HuecoDisponible {
  rutaId: number;
  rutaNombre: string;
  horaSalida: string;
  prioridad: 'ROTACION' | 'MISMA_RUTA' | 'CUALQUIERA';
  razon: string;
  frecuenciaCalculada: number;
}

// Nueva interfaz para huecos almacenados en la base de datos
export interface HuecoDisponibleDB {
  id: number;
  rutaId: number;
  rutaNombre: string;
  horaSalida: Date;
  prioridad: 'ROTACION' | 'MISMA_RUTA' | 'CUALQUIERA';
  razon: string;
  frecuenciaCalculada: number;
  fecha: Date;
  activo: boolean;
}

export interface EstadisticaRotacion {
  movilId: number;
  movilNombre: string;
  rutasA: number;
  rutasB: number;
  porcentajeA: number;
  porcentajeB: number;
  balance: 'BUENO' | 'REGULAR' | 'MALO';
}

export interface AsignacionAutomatica {
  mejorHueco: HuecoDisponible;
  razon: string;
  alternativas: HuecoDisponible[];
}

interface Configuracion {
  id: number;
  tiempoMinimoSalida: number;
  [key: string]: unknown;
}

export class TurnoService {
  private configuracion: Configuracion | null = null;

  /**
   * Inicializa la configuración desde la base de datos
   */
  private async inicializarConfiguracion() {
    console.log('🔧 Inicializando configuración...');
    
    if (!this.configuracion) {
      try {
        console.log('📋 Buscando configuración en la base de datos...');
        this.configuracion = await prisma.configuracion.findFirst();
        
        if (!this.configuracion) {
          console.warn('⚠️ No se encontró configuración en la base de datos, usando valores por defecto');
          // Usar configuración por defecto en lugar de fallar
          this.configuracion = {
            id: 1,
            tiempoMinimoSalida: 2, // Valor por defecto del schema
            frecuenciaAutomatica: true,
            tiempoMaximoTurno: 45,
            activo: true,
            fechaCreacion: new Date(),
            fechaActualizacion: new Date()
          };
        }
        
        console.log('✅ Configuración cargada:', {
          tiempoMinimoSalida: this.configuracion.tiempoMinimoSalida,
          configuracion: this.configuracion
        });
      } catch (error) {
        console.error('❌ Error cargando configuración:', error);
        console.warn('⚠️ Usando configuración por defecto debido al error');
        // Usar configuración por defecto en lugar de fallar
        this.configuracion = {
          id: 1,
          tiempoMinimoSalida: 2, // Valor por defecto del schema
          frecuenciaAutomatica: true,
          tiempoMaximoTurno: 45,
          activo: true,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        };
      }
    } else {
      console.log('✅ Configuración ya estaba cargada');
    }
  }

  /**
   * Obtiene los huecos disponibles para un móvil y conductor específicos
   * Incluye tanto huecos de turnos como programados disponibles
   */
  async obtenerHuecosDisponibles(movilId: number, conductorId: number): Promise<HuecoDisponible[]> {
    await this.inicializarConfiguracion();
    const ahora = TimeService.getCurrentTime();
    
    // Obtener huecos existentes de la base de datos (ya filtrados por tiempo y rutas hechas)
    let huecosExistentes = await this.obtenerHuecosExistentes(ahora, movilId);
    
    // Obtener programados disponibles como huecos adicionales
    const huecosProgramados = await this.obtenerProgramadosDisponiblesComoHuecos(ahora);
    
    // Combinar huecos de turnos con huecos de programados
    huecosExistentes = [...huecosExistentes, ...huecosProgramados];

    // Verificar si necesitamos generar más huecos
    const huecosPorRuta = huecosExistentes.reduce((acc, hueco) => {
      if (!acc[hueco.rutaNombre]) {
        acc[hueco.rutaNombre] = 0;
      }
      acc[hueco.rutaNombre]++;
      return acc;
    }, {} as { [key: string]: number });
    
    console.log('📊 Huecos disponibles por ruta:', huecosPorRuta);
    
    // Verificar si alguna ruta tiene menos de 5 huecos (umbral para regenerar)
    const rutasConPocosHuecos = Object.entries(huecosPorRuta)
      .filter(([ruta, cantidad]) => cantidad < 5)
      .map(([ruta]) => ruta);
    
    if (huecosExistentes.length === 0 || rutasConPocosHuecos.length > 0) {
      console.log('🔄 Necesitamos generar más huecos:', {
        totalHuecos: huecosExistentes.length,
        rutasConPocosHuecos,
        huecosPorRuta
      });
      
      // Verificar si hay huecos en la base de datos que estén en el pasado
      const huecosEnBD = await prisma.huecoDisponible.findMany({
        where: {
          fecha: {
            gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
            lt: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
          },
          activo: true
        },
        orderBy: { horaSalida: 'asc' }
      });

      // Si hay huecos en BD pero todos están en el pasado, limpiarlos y generar nuevos
      if (huecosEnBD.length > 0) {
        const todosEnPasado = huecosEnBD.every(hueco => new Date(hueco.horaSalida) < ahora);
        if (todosEnPasado) {
          console.log('🧹 Todos los huecos están en el pasado, limpiando y regenerando...');
          await this.limpiarHuecosAntiguos(ahora);
        }
      }

      console.log('🔄 Generando huecos adicionales...');
      await this.generarNuevosHuecos(ahora, movilId, conductorId);
      
      // Obtener huecos nuevamente SIN limpiar (para evitar eliminar los que acabamos de generar)
      huecosExistentes = await this.obtenerHuecosExistentesSinLimpiar(ahora, movilId);
      
      // Recontar huecos por ruta después de regenerar
      const huecosPorRutaDespues = huecosExistentes.reduce((acc, hueco) => {
        if (!acc[hueco.rutaNombre]) {
          acc[hueco.rutaNombre] = 0;
        }
        acc[hueco.rutaNombre]++;
        return acc;
      }, {} as { [key: string]: number });
      
      console.log('✅ Huecos regenerados:', {
        totalHuecos: huecosExistentes.length,
        huecosPorRuta: huecosPorRutaDespues
      });
    }
    
    // Contar huecos por ruta para información de debug (usar la variable ya calculada)
    console.log('📊 Huecos disponibles por ruta:', huecosPorRuta);
    console.log('✅ Usando huecos existentes:', huecosExistentes.length, 'huecos disponibles');
    
    return huecosExistentes;
  }

  /**
   * Obtiene huecos existentes de la base de datos
   */
  private async obtenerHuecosExistentes(ahora: Date, movilId: number): Promise<HuecoDisponible[]> {
    // Limpiar huecos antiguos antes de buscar
    await this.limpiarHuecosAntiguos(ahora);
    return this.obtenerHuecosExistentesSinLimpiar(ahora, movilId);
  }

  /**
   * Obtiene huecos existentes de la base de datos SIN limpiar huecos antiguos
   */
  private async obtenerHuecosExistentesSinLimpiar(ahora: Date, movilId: number): Promise<HuecoDisponible[]> {
    const tiempoMinimoSalida = this.configuracion?.tiempoMinimoSalida || 2;
    const margenTolerancia = 1; // 1 minuto para ser consistente con crearTurno
    const horaMinima = new Date(ahora);
    horaMinima.setMinutes(horaMinima.getMinutes() + tiempoMinimoSalida - margenTolerancia);
    
    // Obtener huecos de la base de datos
    const huecosDB = await this.obtenerHuecosDeDB(ahora);
    
    // Obtener rutas que este móvil ya hizo hoy (solo para información de debug)
    const rutasHechasHoy = await this.obtenerRutasHechasPorMovilHoy(movilId, ahora);
    
    console.log('🔍 Rutas hechas por móvil hoy:', {
      movilId,
      rutasHechas: rutasHechasHoy
    });
    
    // Filtrar huecos que respeten el tiempo mínimo y que no estén asignados
    // NO filtrar por rutas hechas - mostrar TODOS los huecos disponibles
    const huecosFiltrados = huecosDB
      .filter(hueco => {
        const horaHueco = new Date(hueco.horaSalida);
        const cumpleTiempoMinimo = horaHueco >= horaMinima;
        const noAsignado = hueco.activo;
        
        if (!cumpleTiempoMinimo) {
          console.log(`❌ Hueco descartado por tiempo mínimo: ${hueco.rutaNombre} - ${horaHueco.toISOString()}`);
        }
        if (!noAsignado) {
          console.log(`❌ Hueco descartado por estar asignado: ${hueco.rutaNombre} - ${horaHueco.toISOString()}`);
        }
        
        return cumpleTiempoMinimo && noAsignado;
      })
      .sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime())
      .map(hueco => ({
        rutaId: hueco.rutaId,
        rutaNombre: hueco.rutaNombre,
        horaSalida: hueco.horaSalida.toISOString(),
        prioridad: hueco.prioridad,
        razon: hueco.razon,
        frecuenciaCalculada: hueco.frecuenciaCalculada
      }));

    // Eliminar duplicados basándose en rutaId y horaSalida
    const huecosSinDuplicados = huecosFiltrados.filter((hueco, index, self) => {
      const esDuplicado = self.findIndex(h => 
        h.rutaId === hueco.rutaId && 
        h.horaSalida === hueco.horaSalida
      ) !== index;
      
      if (esDuplicado) {
        console.log(`🗑️ Eliminando hueco duplicado: ${hueco.rutaNombre} - ${hueco.horaSalida}`);
      }
      
      return !esDuplicado;
    });
    
    console.log('✅ Huecos existentes filtrados:', {
      huecosAntes: huecosFiltrados.length,
      huecosDespues: huecosSinDuplicados.length,
      duplicadosEliminados: huecosFiltrados.length - huecosSinDuplicados.length,
      primerHueco: huecosSinDuplicados[0] ? {
        ruta: huecosSinDuplicados[0].rutaNombre,
        hora: huecosSinDuplicados[0].horaSalida,
        prioridad: huecosSinDuplicados[0].prioridad,
        razon: huecosSinDuplicados[0].razon
      } : null
    });
    
    return huecosSinDuplicados;
  }

  /**
   * Obtiene huecos de la base de datos
   */
  private async obtenerHuecosDeDB(ahora: Date): Promise<HuecoDisponibleDB[]> {
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);
    
    console.log('🔍 Buscando huecos para fecha:', {
      inicioDia: inicioDia.toISOString(),
      finDia: finDia.toISOString(),
      ahora: ahora.toISOString()
    });
    
    // Usar consulta SQL directa hasta que se regenere el cliente de Prisma
    const huecos = await prisma.$queryRaw`
      SELECT id, "rutaId", "rutaNombre", "horaSalida", prioridad, razon, "frecuenciaCalculada", fecha, activo
      FROM "HuecoDisponible"
      WHERE fecha >= ${inicioDia} AND fecha < ${finDia} AND activo = true
      ORDER BY "horaSalida" ASC
    ` as HuecoDisponibleDB[];
    
    console.log('📋 Huecos encontrados en la base de datos:', huecos.length);
    
    return huecos.map((hueco: HuecoDisponibleDB) => ({
      id: hueco.id,
      rutaId: hueco.rutaId,
      rutaNombre: hueco.rutaNombre,
      horaSalida: new Date(hueco.horaSalida),
      prioridad: hueco.prioridad as 'ROTACION' | 'MISMA_RUTA' | 'CUALQUIERA',
      razon: hueco.razon,
      frecuenciaCalculada: hueco.frecuenciaCalculada,
      fecha: new Date(hueco.fecha),
      activo: hueco.activo
    }));
  }

  /**
   * Genera nuevos huecos y los almacena en la base de datos
   */
  private async generarNuevosHuecos(ahora: Date, movilId: number, conductorId: number): Promise<void> {
    console.log('🔄 Generando nuevos huecos GLOBALES...');
    
    // Obtener todas las rutas activas
    const rutas = await prisma.ruta.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });

    console.log('📋 Rutas activas encontradas:', rutas.map(r => r.nombre));

    // Generar huecos alternados respetando las frecuencias de las rutas
    // Los huecos son GLOBALES, no específicos de un móvil/conductor
    const huecos = await this.generarHuecosAlternados(rutas, ahora, movilId, conductorId);
    
    // Almacenar huecos en la base de datos
    await this.almacenarHuecosEnDB(huecos, ahora);
    
    console.log('✅ Nuevos huecos GLOBALES generados y almacenados:', {
      totalHuecos: huecos.length,
      huecosPorRuta: huecos.reduce((acc, h) => {
        acc[h.rutaNombre] = (acc[h.rutaNombre] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number })
    });
  }

  /**
   * Almacena huecos en la base de datos
   */
  private async almacenarHuecosEnDB(huecos: HuecoDisponible[], fecha: Date): Promise<void> {
    if (huecos.length === 0) {
      console.log('📝 No hay huecos para almacenar');
      return;
    }

    console.log('💾 Almacenando huecos en la base de datos:', {
      totalHuecos: huecos.length,
      primerHueco: {
        ruta: huecos[0].rutaNombre,
        hora: huecos[0].horaSalida,
        prioridad: huecos[0].prioridad
      }
    });

    try {
      // Primero, eliminar huecos duplicados existentes para la misma fecha
      const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);
      
      await prisma.$executeRaw`
        DELETE FROM "HuecoDisponible"
        WHERE fecha >= ${inicioDia} AND fecha < ${finDia}
      `;
      
      console.log('🗑️ Huecos existentes eliminados para evitar duplicados');

      // Ahora insertar los nuevos huecos
      for (const hueco of huecos) {
        try {
          // Convertir la hora de salida de string a Date
          const horaSalidaDate = new Date(hueco.horaSalida);
          
          await prisma.$executeRaw`
            INSERT INTO "HuecoDisponible" ("rutaId", "rutaNombre", "horaSalida", prioridad, razon, "frecuenciaCalculada", fecha, activo, "fechaCreacion", "fechaActualizacion")
            VALUES (${hueco.rutaId}, ${hueco.rutaNombre}, ${horaSalidaDate}, ${hueco.prioridad}, ${hueco.razon}, ${hueco.frecuenciaCalculada}, ${fecha}, true, NOW(), NOW())
          `;
          console.log(`  ✅ ${hueco.rutaNombre} ${hueco.horaSalida} (${hueco.prioridad})`);
        } catch (error) {
          console.error(`  ❌ Error almacenando hueco ${hueco.rutaNombre}:`, error);
        }
      }
      
      console.log('✅ Huecos almacenados exitosamente en la base de datos');
    } catch (error) {
      console.error('❌ Error almacenando huecos en la base de datos:', error);
      throw error;
    }
  }

  /**
   * Marca un hueco como asignado en la base de datos
   */
  private async marcarHuecoComoAsignado(rutaId: number, horaSalida: Date): Promise<void> {
    try {
      // Buscar el hueco más cercano a la hora de salida (con tolerancia de 5 minutos)
      const tolerancia = 5 * 60 * 1000; // 5 minutos en milisegundos
      const horaInicio = new Date(horaSalida.getTime() - tolerancia);
      const horaFin = new Date(horaSalida.getTime() + tolerancia);
      
      const resultado = await prisma.huecoDisponible.updateMany({
        where: {
          rutaId: rutaId,
          horaSalida: {
            gte: horaInicio,
            lte: horaFin
          },
          activo: true
        },
        data: {
          activo: false,
          fechaActualizacion: new Date()
        }
      });
      
      console.log('🔒 Hueco marcado como asignado:', {
        rutaId,
        horaSalida: horaSalida.toISOString(),
        filasActualizadas: resultado.count
      });
    } catch (error) {
      console.error('❌ Error marcando hueco como asignado:', error);
      // No lanzar el error para no interrumpir la creación del turno
    }
  }

  /**
   * Limpia huecos antiguos de la base de datos
   */
  private async limpiarHuecosAntiguos(ahora: Date): Promise<void> {
    try {
      // Eliminar huecos de días anteriores
      const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
      
      const resultadoDias = await prisma.$executeRaw`
        DELETE FROM "HuecoDisponible"
        WHERE fecha < ${inicioDia}
      `;
      
      if (resultadoDias > 0) {
        console.log('🧹 Huecos de días anteriores limpiados:', resultadoDias, 'huecos eliminados');
      }
      
      // Eliminar huecos que están en el pasado (hora actual)
      const resultadoPasado = await prisma.$executeRaw`
        DELETE FROM "HuecoDisponible"
        WHERE "horaSalida" < ${ahora}
      `;
      
      if (resultadoPasado > 0) {
        console.log('🧹 Huecos en el pasado limpiados:', resultadoPasado, 'huecos eliminados');
      }
    } catch (error) {
      console.error('❌ Error limpiando huecos antiguos:', error);
    }
  }

  /**
   * Obtiene las rutas que un móvil ya hizo hoy
   */
  private async obtenerRutasHechasPorMovilHoy(movilId: number, ahora: Date): Promise<number[]> {
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);
    
    const turnos = await prisma.turno.findMany({
      where: {
        movilId,
        fecha: { gte: inicioDia, lt: finDia },
        estado: { in: ['PENDIENTE', 'EN_CURSO', 'COMPLETADO'] }
      },
      select: {
        rutaId: true
      }
    });
    
    const rutasHechas = turnos
      .map(turno => turno.rutaId)
      .filter((rutaId): rutaId is number => rutaId !== null);
    
    console.log('📋 Rutas hechas por móvil hoy:', {
      movilId,
      rutasHechas,
      totalTurnos: turnos.length
    });
    
    return rutasHechas;
  }

  /**
   * Genera huecos alternados respetando las frecuencias de las rutas
   * Implementa restricciones horarias cuando hay programados
   */
  private async generarHuecosAlternados(
    rutas: { id: number; nombre: string; frecuenciaActual: number; unaVezDia: boolean; prioridad: number | null; activo: boolean }[],
    ahora: Date,
    movilId: number,
    conductorId: number
  ): Promise<HuecoDisponible[]> {
    const huecos: HuecoDisponible[] = [];
    
    console.log('🔍 DEBUG generarHuecosAlternados:', {
      ahora: ahora.toISOString(),
      rutas: rutas.map(r => r.nombre)
    });
    
    // Verificar si hay programados hoy para aplicar restricciones horarias
    const hayProgramadosHoy = await this.verificarProgramadosHoy(ahora);
    console.log('📅 Hay programados hoy:', hayProgramadosHoy);
    
    // Separar rutas por prioridad - GENERAR PARA TODAS LAS RUTAS
    const rutasPrioridad1 = []; // Rutas A y B que se alternan
    const rutasPrioridad0 = []; // Rutas como C que son independientes
    
    for (const ruta of rutas) {
      console.log(`🔍 Procesando ruta ${ruta.nombre}:`, {
        prioridad: ruta.prioridad,
        unaVezDia: ruta.unaVezDia,
        activo: ruta.activo
      });
      
      // IMPORTANTE: Generar huecos para TODAS las rutas activas
      // NO filtrar por conductor ni por móvil - los huecos son para todos
      // La validación de si un conductor/móvil puede hacer una ruta se hace en la asignación
      
      // Clasificar rutas por prioridad
      if (ruta.prioridad === 1) {
        rutasPrioridad1.push(ruta);
      } else if (ruta.prioridad === 0) {
        rutasPrioridad0.push(ruta);
      }
    }
    
    console.log('📋 Rutas para generar huecos:', {
      prioridad1: rutasPrioridad1.map(r => r.nombre),
      prioridad0: rutasPrioridad0.map(r => r.nombre),
      totalRutas: rutas.length,
      todasLasRutas: rutas.map(r => ({ nombre: r.nombre, prioridad: r.prioridad, unaVezDia: r.unaVezDia }))
    });

    // Obtener turnos existentes para hoy (incluyendo prioridad de ruta)
    const turnosExistentes = await prisma.turno.findMany({
      where: {
        fecha: {
          gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
          lt: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
        }
      },
      include: { 
        ruta: {
          select: {
            id: true,
            nombre: true,
            prioridad: true
          }
        }
      },
      orderBy: { horaSalida: 'asc' }
    });

    console.log('📋 Turnos existentes para verificar conflictos:', turnosExistentes.map(t => ({
      ruta: t.ruta?.nombre,
      hora: t.horaSalida.toISOString(),
      movil: t.movilId
    })));

    // 1. Generar huecos para rutas con prioridad 1 (A y B) - generar para cada ruta por separado
    if (rutasPrioridad1.length > 0) {
      // Obtener el último turno de CUALQUIER móvil con prioridad 1 (A o B) para calcular el siguiente hueco
      const ultimoTurnoPrioridad1 = await prisma.turno.findFirst({
        where: {
          fecha: {
            gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
            lt: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
          },
          ruta: {
            prioridad: 1 // Solo considerar rutas A y B
          }
        },
        include: { ruta: true },
        orderBy: { horaSalida: 'desc' }
      });
      
      console.log('🔍 Último turno de prioridad 1 (A o B):', ultimoTurnoPrioridad1 ? {
        ruta: ultimoTurnoPrioridad1.ruta?.nombre,
        hora: ultimoTurnoPrioridad1.horaSalida.toISOString(),
        movil: ultimoTurnoPrioridad1.movilId
      } : 'Ninguno');
      
      // Calcular hora de inicio para rutas A y B basada en el último turno de prioridad 1
      let horaInicio: Date;
      
      if (ultimoTurnoPrioridad1) {
        // Si hay un último turno de prioridad 1, calcular desde ese turno + frecuencia de la ruta
        horaInicio = new Date(ultimoTurnoPrioridad1.horaSalida);
        // Usar la frecuencia de la ruta que NO fue la última (para alternar)
        const rutaAlternativa = rutasPrioridad1.find(r => r.nombre !== ultimoTurnoPrioridad1.ruta?.nombre);
        const frecuencia = rutaAlternativa?.frecuenciaActual || 6; // Default 6 minutos
        horaInicio.setMinutes(horaInicio.getMinutes() + frecuencia);
        
        console.log('⏰ Calculando hora de inicio para rutas A/B basada en último turno de prioridad 1:', {
          ultimoTurno: ultimoTurnoPrioridad1.horaSalida.toISOString(),
          ultimaRuta: ultimoTurnoPrioridad1.ruta?.nombre,
          rutaAlternativa: rutaAlternativa?.nombre,
          frecuencia,
          horaInicio: horaInicio.toISOString()
        });
        
        // Determinar qué ruta debe ir primero basándose en el último turno de prioridad 1
        const ultimaRutaHecha = ultimoTurnoPrioridad1.ruta?.nombre;
        if (ultimaRutaHecha === 'A') {
          // Si la última fue A, la siguiente debe ser B
          console.log('🔄 Última ruta fue A, siguiente debe ser B');
        } else if (ultimaRutaHecha === 'B') {
          // Si la última fue B, la siguiente debe ser A
          console.log('🔄 Última ruta fue B, siguiente debe ser A');
        }
      } else {
        // Si no hay último turno, usar tiempo mínimo
        const tiempoMinimoSalida = this.configuracion?.tiempoMinimoSalida || 5;
        const margenAdicional = 1;
        horaInicio = new Date(ahora);
        horaInicio.setMinutes(horaInicio.getMinutes() + tiempoMinimoSalida + margenAdicional);
        
        // Aplicar restricción horaria para rutas A y B si hay programados
        if (hayProgramadosHoy) {
          const restriccionHora = new Date(ahora);
          restriccionHora.setHours(7, 0, 0, 0); // 7:00 AM
          
          if (horaInicio < restriccionHora) {
            horaInicio = new Date(restriccionHora);
            console.log('🚫 Aplicando restricción horaria A/B: turnos inician a las 7:00 AM cuando hay programados');
          }
        }
        
        console.log('⏰ Calculando hora de inicio para rutas A/B basada en tiempo mínimo:', {
          ahora: ahora.toISOString(),
          tiempoMinimoSalida,
          margenAdicional,
          horaInicio: horaInicio.toISOString(),
          hayProgramados: hayProgramadosHoy,
          restriccionAplicada: hayProgramadosHoy && horaInicio.getHours() >= 7
        });
      }
      
      // Verificar que la hora de inicio esté en el futuro
      if (horaInicio <= ahora) {
        console.log('⚠️ Hora de inicio está en el pasado, ajustando a hora actual');
        const tiempoMinimoSalida = this.configuracion?.tiempoMinimoSalida || 5;
        const margenAdicional = 1;
        horaInicio = new Date(ahora);
        horaInicio.setMinutes(horaInicio.getMinutes() + tiempoMinimoSalida + margenAdicional);
        console.log('✅ Nueva hora de inicio:', horaInicio.toISOString());
      }
      
      // Generar huecos alternados para rutas A y B - asegurar balance
      let horaActual = new Date(horaInicio);
      const huecosPorRuta = 10; // Exactamente 10 huecos por ruta
      const totalHuecos = rutasPrioridad1.length * huecosPorRuta;
      
      console.log('🎯 DEBUG horaActual para generar huecos:', {
        horaInicio: horaInicio.toISOString(),
        horaActual: horaActual.toISOString(),
        huecosPorRuta,
        totalHuecos
      });
      
      console.log('🎯 Generando huecos balanceados:', {
        rutas: rutasPrioridad1.map(r => r.nombre),
        huecosPorRuta,
        totalHuecos
      });
      
      // Determinar qué ruta debe ir primero basándose en el último turno de prioridad 1
      let rutaInicial = 0; // Índice de la primera ruta a generar
      if (ultimoTurnoPrioridad1) {
        const ultimaRutaHecha = ultimoTurnoPrioridad1.ruta?.nombre;
        if (ultimaRutaHecha === 'A') {
          // Si la última fue A, la siguiente debe ser B
          rutaInicial = rutasPrioridad1.findIndex(r => r.nombre === 'B');
          console.log('🔄 Comenzando con ruta B porque la última fue A');
        } else if (ultimaRutaHecha === 'B') {
          // Si la última fue B, la siguiente debe ser A
          rutaInicial = rutasPrioridad1.findIndex(r => r.nombre === 'A');
          console.log('🔄 Comenzando con ruta A porque la última fue B');
        }
      }
      
      let indiceRuta = rutaInicial; // Comenzar con la ruta correcta
      let huecosGenerados = 0;

      while (huecosGenerados < totalHuecos) {
        const ruta = rutasPrioridad1[indiceRuta % rutasPrioridad1.length];
        
        // Verificar que no haya conflictos solo con turnos de rutas A y B (rutas A y B compiten entre sí)
        const hayConflicto = turnosExistentes.some(turno => {
          // Solo verificar conflictos con rutas A y B (prioridad 1)
          if (turno.ruta?.prioridad !== 1) {
            return false;
          }
          const horaTurno = new Date(turno.horaSalida);
          const diferencia = Math.abs(horaActual.getTime() - horaTurno.getTime()) / (1000 * 60);
          const esConflicto = diferencia < 5; // 5 minutos de margen
          
          if (esConflicto) {
            console.log(`⚠️ Conflicto detectado: ${ruta.nombre} ${horaActual.toISOString()} vs ${turno.ruta?.nombre} ${turno.horaSalida} (${diferencia} min)`);
          }
          
          return esConflicto;
        });

        if (!hayConflicto) {
          huecos.push({
            rutaId: ruta.id,
            rutaNombre: ruta.nombre,
            horaSalida: horaActual.toISOString(),
            prioridad: await this.calcularPrioridad(ruta, horaActual, movilId),
            razon: await this.generarRazon(ruta, horaActual, movilId),
            frecuenciaCalculada: ruta.frecuenciaActual
          });
          huecosGenerados++;
        }

        // Avanzar al siguiente hueco usando la frecuencia de la ruta actual
        const horaAnterior = new Date(horaActual);
        horaActual = new Date(horaActual);
        horaActual.setMinutes(horaActual.getMinutes() + ruta.frecuenciaActual);
        
        const tiempoTranscurrido = (horaActual.getTime() - horaAnterior.getTime()) / (1000 * 60);
        console.log(`🔄 Avanzando ${ruta.frecuenciaActual} minutos para ${ruta.nombre}: ${horaActual.toISOString()}`);
        console.log(`⏱️ Tiempo transcurrido desde último hueco: ${tiempoTranscurrido} minutos`);
        
        indiceRuta++;
      }
    }

    // 2. Generar huecos para rutas con prioridad 0 (como C) - independientes
    for (const ruta of rutasPrioridad0) {
      // Calcular hora de inicio para esta ruta específica basada en sus turnos existentes
      const turnosExistentesRuta = turnosExistentes.filter(t => t.rutaId === ruta.id);
      let horaInicioRuta: Date;
      
      if (turnosExistentesRuta.length > 0) {
        // Si hay turnos existentes, calcular desde el último turno + frecuencia de la ruta
        const ultimoTurno = turnosExistentesRuta[turnosExistentesRuta.length - 1];
        horaInicioRuta = new Date(ultimoTurno.horaSalida);
        horaInicioRuta.setMinutes(horaInicioRuta.getMinutes() + ruta.frecuenciaActual);
        
        console.log(`⏰ Calculando hora de inicio para ${ruta.nombre} basada en último turno:`, {
          ultimoTurno: ultimoTurno.horaSalida.toISOString(),
          frecuenciaRuta: ruta.frecuenciaActual,
          horaInicioRuta: horaInicioRuta.toISOString()
        });
        
        // Verificar que la hora de inicio esté en el futuro
        if (horaInicioRuta <= ahora) {
          console.log(`⚠️ Hora de inicio para ${ruta.nombre} está en el pasado, ajustando a hora actual`);
          const tiempoMinimoSalida = this.configuracion?.tiempoMinimoSalida || 5;
          const margenAdicional = 1;
          horaInicioRuta = new Date(ahora);
          horaInicioRuta.setMinutes(horaInicioRuta.getMinutes() + tiempoMinimoSalida + margenAdicional);
          console.log(`✅ Nueva hora de inicio para ${ruta.nombre}:`, horaInicioRuta.toISOString());
        }
      } else {
        // Si no hay turnos existentes, usar tiempo mínimo
        const tiempoMinimoSalida = this.configuracion?.tiempoMinimoSalida || 5;
        const margenAdicional = 1;
        horaInicioRuta = new Date(ahora);
        horaInicioRuta.setMinutes(horaInicioRuta.getMinutes() + tiempoMinimoSalida + margenAdicional);
        
        // Aplicar restricción horaria para ruta C si hay programados
        if (hayProgramadosHoy && ruta.nombre === 'C') {
          const restriccionHoraC = new Date(ahora);
          restriccionHoraC.setHours(8, 30, 0, 0); // 8:30 AM
          
          if (horaInicioRuta < restriccionHoraC) {
            horaInicioRuta = new Date(restriccionHoraC);
            console.log('🚫 Aplicando restricción horaria C: turnos inician a las 8:30 AM cuando hay programados');
          }
        }
        
        console.log(`⏰ Calculando hora de inicio para ${ruta.nombre} basada en tiempo mínimo:`, {
          ahora: ahora.toISOString(),
          tiempoMinimoSalida,
          margenAdicional,
          horaInicioRuta: horaInicioRuta.toISOString(),
          hayProgramados: hayProgramadosHoy,
          restriccionAplicada: hayProgramadosHoy && ruta.nombre === 'C' && horaInicioRuta.getHours() >= 8
        });
      }
      
      let horaActual = new Date(horaInicioRuta);
      let huecosGenerados = 0;
      const huecosPorRuta = 10; // Exactamente 10 huecos por ruta independiente

      console.log(`🎯 Generando ${huecosPorRuta} huecos para ruta ${ruta.nombre} (independiente)`);

      while (huecosGenerados < huecosPorRuta) {
        // Verificar que no haya conflictos solo con turnos de la MISMA RUTA (ruta C es independiente)
        const hayConflicto = turnosExistentes.some(turno => {
          // Solo verificar conflictos si es la misma ruta (ruta C es independiente)
          if (turno.rutaId !== ruta.id) {
            return false;
          }
          const horaTurno = new Date(turno.horaSalida);
          const diferencia = Math.abs(horaActual.getTime() - horaTurno.getTime()) / (1000 * 60);
          const esConflicto = diferencia < 5; // 5 minutos de margen
          
          if (esConflicto) {
            console.log(`⚠️ Conflicto detectado: ${ruta.nombre} ${horaActual.toISOString()} vs ${turno.ruta?.nombre} ${turno.horaSalida} (${diferencia} min)`);
          }
          
          return esConflicto;
        });

        if (!hayConflicto) {
          huecos.push({
            rutaId: ruta.id,
            rutaNombre: ruta.nombre,
            horaSalida: horaActual.toISOString(),
            prioridad: await this.calcularPrioridad(ruta, horaActual, movilId),
            razon: await this.generarRazon(ruta, horaActual, movilId),
            frecuenciaCalculada: ruta.frecuenciaActual
          });
          huecosGenerados++;
        }

        // Avanzar usando la frecuencia de esta ruta específica
        const horaAnterior = new Date(horaActual);
        horaActual = new Date(horaActual);
        horaActual.setMinutes(horaActual.getMinutes() + ruta.frecuenciaActual);
        
        const tiempoTranscurrido = (horaActual.getTime() - horaAnterior.getTime()) / (1000 * 60);
        console.log(`🔄 Avanzando ${ruta.frecuenciaActual} minutos para ${ruta.nombre} (independiente): ${horaActual.toISOString()}`);
        console.log(`⏱️ Tiempo transcurrido desde último hueco: ${tiempoTranscurrido} minutos`);
      }
    }

    // Log del balance final de huecos generados
    const balanceFinal = huecos.reduce((acc, hueco) => {
      if (!acc[hueco.rutaNombre]) {
        acc[hueco.rutaNombre] = 0;
      }
      acc[hueco.rutaNombre]++;
      return acc;
    }, {} as { [key: string]: number });

    console.log('🎯 Balance final de huecos generados:', {
      totalHuecos: huecos.length,
      balancePorRuta: balanceFinal,
      rutasConPocosHuecos: Object.entries(balanceFinal)
        .filter(([ruta, cantidad]) => cantidad < 5)
        .map(([ruta]) => ruta)
    });

    return huecos;
  }

  /**
   * Genera huecos para una ruta específica (método original mantenido para compatibilidad)
   */
  private async generarHuecosParaRuta(
    ruta: { id: number; nombre: string; frecuenciaActual: number; unaVezDia: boolean; prioridad: number | null; activo: boolean }, 
    ahora: Date, 
    movilId: number, 
    conductorId: number
  ): Promise<HuecoDisponible[]> {
    const huecos: HuecoDisponible[] = [];
    const tiempoMinimoSalida = this.configuracion?.tiempoMinimoSalida || 5; // Usar tiempo mínimo en lugar de frecuencia
    
    console.log('🔍 DEBUG generarHuecosParaRuta:', {
      ruta: ruta.nombre,
      ahora: ahora.toISOString(),
      tiempoMinimoSalida
    });
    
    // IMPORTANTE: Generar huecos para TODAS las rutas activas
    // NO filtrar por conductor - los huecos son globales para todos los conductores
    // La validación de si un conductor puede hacer una ruta se hace en la asignación

    // Obtener turnos existentes de esta ruta para hoy
    const turnosExistentes = await prisma.turno.findMany({
      where: {
        rutaId: ruta.id,
        fecha: {
          gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
          lt: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
        }
      },
      orderBy: { horaSalida: 'asc' }
    });

    console.log(`📋 Turnos existentes para ruta ${ruta.nombre}:`, turnosExistentes.length);

    // Calcular el primer hueco disponible respetando el tiempo mínimo de salida
    const horaInicio = new Date(ahora);
    horaInicio.setMinutes(horaInicio.getMinutes() + tiempoMinimoSalida);
    
    console.log('⏰ DEBUG horaInicio calculada:', {
      ahora: ahora.toISOString(),
      horaInicio: horaInicio.toISOString(),
      tiempoMinimoSalida
    });
    
    console.log('⏰ Generando huecos para ruta:', ruta.nombre, {
      ahora: ahora.toISOString(),
      tiempoMinimoSalida,
      horaInicio: horaInicio.toISOString(),
      turnosExistentes: turnosExistentes.length
    });

    // Si hay turnos existentes, calcular huecos entre ellos
    if (turnosExistentes.length > 0) {
      for (let i = 0; i < turnosExistentes.length; i++) {
        const turnoActual = turnosExistentes[i];
        const turnoSiguiente = turnosExistentes[i + 1];
        
        const horaHueco = new Date(turnoActual.horaSalida);
        horaHueco.setMinutes(horaHueco.getMinutes() + tiempoMinimoSalida);
        let esPrimerHueco = true;
        
        // Generar huecos hasta el siguiente turno o hasta completar 10
        while (huecos.length < 10 && 
               (!turnoSiguiente || horaHueco < new Date(turnoSiguiente.horaSalida))) {
          
          if (horaHueco >= horaInicio) {
            huecos.push({
              rutaId: ruta.id,
              rutaNombre: ruta.nombre,
              horaSalida: horaHueco.toISOString(),
              prioridad: 'CUALQUIERA', // Para huecos globales, usar prioridad neutral
              razon: `Hueco disponible para ${ruta.nombre} (${Math.round((horaHueco.getTime() - ahora.getTime()) / (1000 * 60))} min)`,
              frecuenciaCalculada: esPrimerHueco ? tiempoMinimoSalida : ruta.frecuenciaActual
            });
          }
          
          // Para el primer hueco usar tiempo mínimo, para los siguientes usar frecuencia
          if (esPrimerHueco) {
            horaHueco.setMinutes(horaHueco.getMinutes() + tiempoMinimoSalida);
            esPrimerHueco = false;
          } else {
            horaHueco.setMinutes(horaHueco.getMinutes() + ruta.frecuenciaActual);
          }
        }
      }
    }

    // Si no hay suficientes huecos, generar más desde la hora actual
    if (huecos.length < 10) {
      let horaHueco;
      let esPrimerHueco = true;
      
      if (turnosExistentes.length > 0) {
        // Empezar después del último turno, pero asegurar que esté en el futuro
        horaHueco = new Date(turnosExistentes[turnosExistentes.length - 1].horaSalida);
        horaHueco.setMinutes(horaHueco.getMinutes() + tiempoMinimoSalida);
        
        console.log('🔍 DEBUG último turno existente:', {
          ultimoTurno: turnosExistentes[turnosExistentes.length - 1].horaSalida,
          horaHuecoCalculada: horaHueco.toISOString(),
          ahora: ahora.toISOString()
        });
        
        // Si el último turno está en el pasado, empezar desde la hora actual
        if (horaHueco <= ahora) {
          console.log('⚠️ Último turno está en el pasado, usando hora actual');
          horaHueco = new Date(ahora);
          horaHueco.setMinutes(horaHueco.getMinutes() + tiempoMinimoSalida);
        }
      } else {
        // No hay turnos existentes, empezar desde la hora actual
        console.log('🆕 No hay turnos existentes, usando hora actual');
        horaHueco = new Date(ahora);
        horaHueco.setMinutes(horaHueco.getMinutes() + tiempoMinimoSalida);
      }

      console.log('🎯 DEBUG horaHueco final para generar:', horaHueco.toISOString());

      while (huecos.length < 10) {
        console.log(`✅ Generando hueco ${huecos.length + 1}: ${horaHueco.toISOString()}`);
        huecos.push({
          rutaId: ruta.id,
          rutaNombre: ruta.nombre,
          horaSalida: horaHueco.toISOString(),
          prioridad: 'CUALQUIERA', // Para huecos globales, usar prioridad neutral
          razon: `Hueco disponible para ${ruta.nombre} (${Math.round((horaHueco.getTime() - ahora.getTime()) / (1000 * 60))} min)`,
          frecuenciaCalculada: esPrimerHueco ? tiempoMinimoSalida : ruta.frecuenciaActual
        });
        
        // Para el primer hueco usar tiempo mínimo, para los siguientes usar frecuencia
        if (esPrimerHueco) {
          horaHueco.setMinutes(horaHueco.getMinutes() + tiempoMinimoSalida);
          esPrimerHueco = false;
        } else {
          horaHueco.setMinutes(horaHueco.getMinutes() + ruta.frecuenciaActual);
        }
      }
    }

    return huecos.slice(0, 10); // Máximo 10 huecos por ruta
  }

  /**
   * Calcula la prioridad de un hueco basado en las reglas de negocio
   * Incluye alternancia considerando programados
   */
  private async calcularPrioridad(ruta: { prioridad: number | null; nombre: string }, horaHueco: Date, movilId: number): Promise<'ROTACION' | 'MISMA_RUTA' | 'CUALQUIERA'> {
    // Prioridad 0 = ruta más cercana
    if (ruta.prioridad === 0) {
      return 'CUALQUIERA';
    }
    
    // Prioridad 1 = intercalar rutas (A y B)
    if (ruta.prioridad === 1) {
      const ahora = TimeService.getCurrentTime();
      const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
      const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

      // Verificar último evento (turno o programado) de prioridad 1 para este móvil
      const [ultimoTurno, ultimoProgramado] = await Promise.all([
        prisma.turno.findFirst({
          where: {
            movilId,
            fecha: { gte: inicioDia, lt: finDia },
            ruta: { prioridad: 1 } // Solo rutas A y B
          },
          include: { ruta: true },
          orderBy: { horaSalida: 'desc' }
        }),
        prisma.programacion.findFirst({
          where: {
            movilId,
            fecha: { gte: inicioDia, lt: finDia },
            ruta: { in: ['Despacho A', 'Despacho B'] } // Programados equivalentes a A y B
          },
          orderBy: { hora: 'desc' }
        })
      ]);

      // Determinar cuál fue el último evento de prioridad 1
      let ultimoEvento: { ruta: string; hora: Date; tipo: 'turno' | 'programado' } | null = null;

      if (ultimoTurno && ultimoProgramado) {
        const horaUltimoTurno = new Date(ultimoTurno.horaSalida);
        const horaUltimoProgramado = new Date(ultimoProgramado.hora);
        
        if (horaUltimoTurno > horaUltimoProgramado) {
          ultimoEvento = {
            ruta: ultimoTurno.ruta?.nombre || '',
            hora: horaUltimoTurno,
            tipo: 'turno'
          };
        } else {
          ultimoEvento = {
            ruta: ultimoProgramado.ruta === 'Despacho A' ? 'A' : 'B',
            hora: horaUltimoProgramado,
            tipo: 'programado'
          };
        }
      } else if (ultimoTurno) {
        ultimoEvento = {
          ruta: ultimoTurno.ruta?.nombre || '',
          hora: new Date(ultimoTurno.horaSalida),
          tipo: 'turno'
        };
      } else if (ultimoProgramado) {
        ultimoEvento = {
          ruta: ultimoProgramado.ruta === 'Despacho A' ? 'A' : 'B',
          hora: new Date(ultimoProgramado.hora),
          tipo: 'programado'
        };
      }
      
      console.log(`🔍 Calculando prioridad para ruta ${ruta.nombre}, móvil ${movilId}:`, {
        ultimoEvento,
        rutaActual: ruta.nombre,
        esMismaRuta: ultimoEvento && ultimoEvento.ruta === ruta.nombre
      });
      
      // Si el último evento fue la misma ruta, dar menor prioridad
      if (ultimoEvento && ultimoEvento.ruta === ruta.nombre) {
        console.log(`⚠️ Ruta ${ruta.nombre} marcada como MISMA_RUTA para móvil ${movilId} (último evento: ${ultimoEvento.tipo})`);
        return 'MISMA_RUTA'; // Menor prioridad para rutas repetidas
      }
      
      console.log(`✅ Ruta ${ruta.nombre} marcada como ROTACION para móvil ${movilId}`);
      return 'ROTACION';
    }
    
    return 'MISMA_RUTA';
  }

  /**
   * Genera la razón para un hueco
   */
  private async generarRazon(ruta: { prioridad: number | null; nombre: string }, horaHueco: Date, movilId: number): Promise<string> {
    const ahora = TimeService.getCurrentTime();
    const tiempoHastaSalida = (horaHueco.getTime() - ahora.getTime()) / (1000 * 60);
    
    if (ruta.prioridad === 0) {
      return `Ruta más cercana disponible (${Math.round(tiempoHastaSalida)} min)`;
    }
    
    if (ruta.prioridad === 1) {
      // Verificar si este móvil ya hizo esta ruta en su último turno (SOLO rutas A y B)
      const ultimoTurnoMovil = await prisma.turno.findFirst({
        where: {
          movilId,
          fecha: {
            gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
            lt: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1)
          },
          ruta: {
            prioridad: 1 // Solo considerar rutas A y B para la rotación
          }
        },
        include: { ruta: true },
        orderBy: { horaSalida: 'desc' }
      });
      
      // Si el último turno fue la misma ruta, indicar que es para evitar repetición
      if (ultimoTurnoMovil && ultimoTurnoMovil.ruta?.nombre === ruta.nombre) {
        return `Evitar repetición de ${ruta.nombre} (${Math.round(tiempoHastaSalida)} min)`;
      }
      
      return `Rotación de rutas (${Math.round(tiempoHastaSalida)} min)`;
    }
    
    return `Hueco disponible (${Math.round(tiempoHastaSalida)} min)`;
  }

  /**
   * Obtiene las estadísticas de rotación para todos los móviles
   */
  async obtenerEstadisticasRotacion(): Promise<EstadisticaRotacion[]> {
    const moviles = await prisma.automovil.findMany({
      where: { activo: true },
      orderBy: { movil: 'asc' }
    });

    const estadisticas: EstadisticaRotacion[] = [];

    for (const movil of moviles) {
      const rutasHechas = await this.obtenerRutasHechasPorMovil(movil.id);
      const totalRutas = rutasHechas.rutaA + rutasHechas.rutaB;
      
      if (totalRutas > 0) {
        const porcentajeA = Math.round((rutasHechas.rutaA / totalRutas) * 100);
        const porcentajeB = Math.round((rutasHechas.rutaB / totalRutas) * 100);
        
        let balance: 'BUENO' | 'REGULAR' | 'MALO' = 'BUENO';
        if (Math.abs(porcentajeA - porcentajeB) > 30) {
          balance = 'MALO';
        } else if (Math.abs(porcentajeA - porcentajeB) > 15) {
          balance = 'REGULAR';
        }

        estadisticas.push({
          movilId: movil.id,
          movilNombre: movil.movil,
          rutasA: rutasHechas.rutaA,
          rutasB: rutasHechas.rutaB,
          porcentajeA,
          porcentajeB,
          balance
        });
      }
    }

    return estadisticas;
  }

  /**
   * Obtiene las rutas hechas por un móvil específico
   */
  private async obtenerRutasHechasPorMovil(movilId: number): Promise<{ rutaA: number; rutaB: number }> {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const turnos = await prisma.turno.findMany({
      where: {
        movilId,
        fecha: { gte: inicioMes },
        estado: { in: ['COMPLETADO', 'EN_CURSO'] }
      },
      include: { ruta: true }
    });

    const rutaA = turnos.filter(t => t.ruta?.nombre === 'A').length;
    const rutaB = turnos.filter(t => t.ruta?.nombre === 'B').length;

    return { rutaA, rutaB };
  }

  /**
   * Realiza la asignación automática para un móvil y conductor
   */
  async asignacionAutomatica(movilId: number, conductorId: number): Promise<AsignacionAutomatica | null> {
    const huecos = await this.obtenerHuecosDisponibles(movilId, conductorId);
    
    if (huecos.length === 0) {
      throw new Error('No hay huecos disponibles');
    }

    // Obtener información detallada de las rutas hechas (turnos + programados)
    const ahora = TimeService.getCurrentTime();
    const fechaHoy = ahora.toISOString().split('T')[0];
    
    // Obtener turnos del día
    const todosTurnosHoy = await prisma.turno.findMany({
      where: {
        movilId,
        estado: { in: ['COMPLETADO', 'EN_CURSO', 'PENDIENTE'] }
      },
      include: { ruta: true },
      orderBy: { horaSalida: 'desc' }
    });
    
    // Filtrar turnos de hoy
    const turnosHoy = todosTurnosHoy.filter(turno => {
      const fechaTurno = new Date(turno.fecha).toISOString().split('T')[0];
      return fechaTurno === fechaHoy;
    });
    
    // Obtener programados del día
    const todosProgramadosHoy = await prisma.programacion.findMany({
      where: {
        movilId,
        disponible: false // Solo programados asignados
      },
      orderBy: { hora: 'desc' }
    });
    
    // Filtrar programados de hoy
    const programadosHoy = todosProgramadosHoy.filter(prog => {
      const fechaProgramado = new Date(prog.fecha).toISOString().split('T')[0];
      return fechaProgramado === fechaHoy;
    });
    
    // Combinar rutas hechas de turnos y programados
    const rutasHechasTurnos = turnosHoy.map(t => t.ruta?.nombre).filter(Boolean);
    const rutasHechasProgramados = programadosHoy.map(p => {
      console.log('🔍 Mapeando programado:', { ruta: p.ruta, id: p.id });
      
      // Mapear nombres de programados a nombres de rutas
      if (p.ruta === 'DESPACHO D. RUT7 CORZO LORETO' || 
          p.ruta === 'DESPACHO E RUT7 CORZO' || 
          p.ruta === 'DESPACHO D RUT4 PAMPA-CORZO') {
        console.log('✅ Programado mapeado a C (rutas específicas):', p.ruta);
        return 'C'; // Estos programados son equivalentes a Despacho C
      }
      
      // Mapear variaciones de nombres de despachos
      if (p.ruta === 'Despacho A' || p.ruta === 'DESPACHO A' || p.ruta === 'Despacho Despacho A') return 'A';
      if (p.ruta === 'Despacho B' || p.ruta === 'DESPACHO B' || p.ruta === 'Despacho Despacho B') return 'B';
      if (p.ruta === 'Despacho C' || p.ruta === 'DESPACHO C' || p.ruta === 'Despacho Despacho C') {
        console.log('✅ Programado mapeado a C (despacho directo):', p.ruta);
        return 'C';
      }
      
      // Si contiene "Despacho C" en cualquier parte del nombre
      if (p.ruta && p.ruta.includes('Despacho C')) {
        console.log('✅ Programado mapeado a C (contiene "Despacho C"):', p.ruta);
        return 'C';
      }
      
      console.log('❓ Programado no mapeado:', p.ruta);
      return p.ruta;
    }).filter(Boolean);
    
    const rutasHechasNombres = [...rutasHechasTurnos, ...rutasHechasProgramados];
    
    // Encontrar la última ruta A o B (para alternancia) considerando turnos y programados
    const ultimaRutaABTurno = turnosHoy.find(t => t.ruta?.nombre === 'A' || t.ruta?.nombre === 'B')?.ruta?.nombre;
    const ultimaRutaABProgramado = programadosHoy.find(p => {
      const rutaMapeada = p.ruta === 'Despacho A' || p.ruta === 'DESPACHO A' || p.ruta === 'Despacho Despacho A' ? 'A' :
                          p.ruta === 'Despacho B' || p.ruta === 'DESPACHO B' || p.ruta === 'Despacho Despacho B' ? 'B' : null;
      return rutaMapeada === 'A' || rutaMapeada === 'B';
    });
    
    // Determinar cuál fue la última (turnos y programados combinados)
    let ultimaRutaAB = ultimaRutaABTurno;
    if (ultimaRutaABProgramado) {
      const rutaProgramadaMapeada = ultimaRutaABProgramado.ruta === 'Despacho A' || ultimaRutaABProgramado.ruta === 'DESPACHO A' || ultimaRutaABProgramado.ruta === 'Despacho Despacho A' ? 'A' : 'B';
      
      // Si hay ambos, comparar horarios para ver cuál fue el último
      if (ultimaRutaABTurno) {
        const ultimoTurnoAB = turnosHoy.find(t => t.ruta?.nombre === ultimaRutaABTurno);
        const horaTurno = ultimoTurnoAB ? new Date(ultimoTurnoAB.horaSalida) : new Date(0);
        const horaProgramado = new Date(ultimaRutaABProgramado.hora);
        
        if (horaProgramado > horaTurno) {
          ultimaRutaAB = rutaProgramadaMapeada;
        }
      } else {
        ultimaRutaAB = rutaProgramadaMapeada;
      }
    }
    
    // La última ruta de cualquier tipo (para logs)
    const ultimaRutaHecha = turnosHoy[0]?.ruta?.nombre;
    
    console.log('🔍 Rutas hechas hoy por móvil (turnos + programados):', {
      movilId,
      turnosHoy: turnosHoy.length,
      programadosHoy: programadosHoy.length,
      rutasHechasTurnos,
      rutasHechasProgramados,
      rutasHechasTotal: rutasHechasNombres,
      ultimaRutaABTurno,
      ultimaRutaABProgramado: ultimaRutaABProgramado?.ruta,
      ultimaRutaABFinal: ultimaRutaAB,
      ultimaRutaHecha,
      debeAlternar: ultimaRutaAB === 'A' ? 'B' : ultimaRutaAB === 'B' ? 'A' : 'N/A'
    });
    
    // Filtrar huecos para la sugerencia automática
    const huecosParaSugerencia = huecos.filter(hueco => {
      // Mapear nombre del hueco a nombre corto para comparación
      const rutaHuecoCorta = hueco.rutaNombre === 'Despacho A' ? 'A' :
                            hueco.rutaNombre === 'Despacho B' ? 'B' :
                            hueco.rutaNombre === 'Despacho C' ? 'C' :
                            hueco.rutaNombre;
      
      console.log(`🔍 Evaluando hueco para sugerencia: ${hueco.rutaNombre}`, {
        rutaHuecoCorta,
        rutasHechasNombres,
        includeC: rutasHechasNombres.includes('C'),
        esCDespacho: rutaHuecoCorta === 'C'
      });
      
      // Si ya hizo la ruta C, no permitir sugerirla nuevamente (solo se hace una vez)
      if (rutaHuecoCorta === 'C' && rutasHechasNombres.includes('C')) {
        const origenC = rutasHechasTurnos.includes('C') ? 'turno' : 'programado';
        console.log(`🚫 Hueco descartado para sugerencia automática: ${hueco.rutaNombre} (móvil ${movilId} ya hizo la ruta C hoy como ${origenC})`);
        return false;
      }
      
      // Para rutas A y B, permitir repetición pero respetar la alternancia
      if (rutaHuecoCorta === 'A' || rutaHuecoCorta === 'B') {
        return true;
      }
      
      // Para otras rutas, no mostrar si ya las hizo
      const noRepiteRuta = !rutasHechasNombres.includes(rutaHuecoCorta);
      if (!noRepiteRuta) {
        console.log(`🚫 Hueco descartado para sugerencia automática: ${hueco.rutaNombre} (móvil ${movilId} ya hizo esta ruta hoy)`);
      }
      return noRepiteRuta;
    });

    if (huecosParaSugerencia.length === 0) {
      console.log('❌ No hay huecos disponibles para sugerencia automática');
      return null;
    }

    console.log('🔍 Huecos para sugerencia automática:', huecosParaSugerencia.map(h => ({
      ruta: h.rutaNombre,
      hora: h.horaSalida,
      prioridad: h.prioridad,
      razon: h.razon
    })));

    // PASO 1: Encontrar el hueco más temprano de cada tipo
    const huecoMasTempranoA = huecosParaSugerencia.filter(h => {
      const rutaCorta = h.rutaNombre === 'Despacho A' ? 'A' : 
                       h.rutaNombre === 'Despacho B' ? 'B' : 
                       h.rutaNombre === 'Despacho C' ? 'C' : h.rutaNombre;
      return rutaCorta === 'A';
    }).sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime())[0];
    
    const huecoMasTempranoB = huecosParaSugerencia.filter(h => {
      const rutaCorta = h.rutaNombre === 'Despacho A' ? 'A' : 
                       h.rutaNombre === 'Despacho B' ? 'B' : 
                       h.rutaNombre === 'Despacho C' ? 'C' : h.rutaNombre;
      return rutaCorta === 'B';
    }).sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime())[0];
    
    const huecoMasTempranoC = huecosParaSugerencia.filter(h => {
      const rutaCorta = h.rutaNombre === 'Despacho A' ? 'A' : 
                       h.rutaNombre === 'Despacho B' ? 'B' : 
                       h.rutaNombre === 'Despacho C' ? 'C' : h.rutaNombre;
      return rutaCorta === 'C';
    }).sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime())[0];

    console.log('🔍 Huecos más tempranos por tipo:', {
      A: huecoMasTempranoA ? `${huecoMasTempranoA.rutaNombre} ${huecoMasTempranoA.horaSalida}` : 'No disponible',
      B: huecoMasTempranoB ? `${huecoMasTempranoB.rutaNombre} ${huecoMasTempranoB.horaSalida}` : 'No disponible',
      C: huecoMasTempranoC ? `${huecoMasTempranoC.rutaNombre} ${huecoMasTempranoC.horaSalida}` : 'No disponible'
    });

    // PASO 2: Determinar la sugerencia basada en alternancia
    let sugerenciaPorAlternancia = null;
    
    console.log('🔍 Evaluando alternancia:', {
      ultimaRutaAB,
      huecoMasTempranoA: huecoMasTempranoA ? `${huecoMasTempranoA.rutaNombre} ${huecoMasTempranoA.horaSalida}` : 'No disponible',
      huecoMasTempranoB: huecoMasTempranoB ? `${huecoMasTempranoB.rutaNombre} ${huecoMasTempranoB.horaSalida}` : 'No disponible'
    });
    
    if (ultimaRutaAB === 'A' && huecoMasTempranoB) {
      sugerenciaPorAlternancia = huecoMasTempranoB;
      console.log(`🔄 Alternancia: última fue A, sugiriendo B ${huecoMasTempranoB.horaSalida}`);
    } else if (ultimaRutaAB === 'B' && huecoMasTempranoA) {
      sugerenciaPorAlternancia = huecoMasTempranoA;
      console.log(`🔄 Alternancia: última fue B, sugiriendo A ${huecoMasTempranoA.horaSalida}`);
    } else if (ultimaRutaAB === 'A' && !huecoMasTempranoB && huecoMasTempranoA) {
      sugerenciaPorAlternancia = huecoMasTempranoA;
      console.log(`🔄 Alternancia: última fue A, no hay B disponible, sugiriendo A ${huecoMasTempranoA.horaSalida}`);
    } else if (ultimaRutaAB === 'B' && !huecoMasTempranoA && huecoMasTempranoB) {
      sugerenciaPorAlternancia = huecoMasTempranoB;
      console.log(`🔄 Alternancia: última fue B, no hay A disponible, sugiriendo B ${huecoMasTempranoB.horaSalida}`);
    } else if (!ultimaRutaAB) {
      // Si no hay rutas previas, priorizar por tiempo (A, B o C, el que salga primero)
      const huecosDisponibles = [];
      if (huecoMasTempranoA) huecosDisponibles.push(huecoMasTempranoA);
      if (huecoMasTempranoB) huecosDisponibles.push(huecoMasTempranoB);
      if (huecoMasTempranoC && !rutasHechasNombres.includes('C')) huecosDisponibles.push(huecoMasTempranoC);
      
      if (huecosDisponibles.length > 0) {
        // Ordenar por tiempo y tomar el más temprano
        sugerenciaPorAlternancia = huecosDisponibles.sort((a, b) => 
          new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime()
        )[0];
        console.log(`🔄 Sin rutas previas: eligiendo ${sugerenciaPorAlternancia.rutaNombre} ${sugerenciaPorAlternancia.horaSalida} (más temprano disponible)`);
      }
    } else {
      // Si no se cumple ninguna condición de alternancia
      console.log('❌ No se encontró sugerencia por alternancia:', {
        ultimaRutaAB,
        condicionesEvaluadas: {
          'ultimaRutaAB === A && huecoMasTempranoB': ultimaRutaAB === 'A' && !!huecoMasTempranoB,
          'ultimaRutaAB === B && huecoMasTempranoA': ultimaRutaAB === 'B' && !!huecoMasTempranoA,
          'ultimaRutaAB === A && !huecoMasTempranoB && huecoMasTempranoA': ultimaRutaAB === 'A' && !huecoMasTempranoB && !!huecoMasTempranoA,
          'ultimaRutaAB === B && !huecoMasTempranoA && huecoMasTempranoB': ultimaRutaAB === 'B' && !huecoMasTempranoA && !!huecoMasTempranoB,
          '!ultimaRutaAB': !ultimaRutaAB
        }
      });
    }

    // PASO 3: Verificar si hay una ruta C mejor (solo si hay rutas previas)
    let mejorHueco = sugerenciaPorAlternancia;
    
    // Solo aplicar lógica de C vs alternancia si hay rutas previas
    if (ultimaRutaAB && huecoMasTempranoC && !rutasHechasNombres.includes('C') && sugerenciaPorAlternancia) {
      const horaC = new Date(huecoMasTempranoC.horaSalida).getTime();
      const horaSugerencia = new Date(sugerenciaPorAlternancia.horaSalida).getTime();
      
      if (horaC < horaSugerencia) {
        mejorHueco = huecoMasTempranoC;
        console.log(`🔄 C mejor que alternancia: C ${huecoMasTempranoC.horaSalida} está antes que ${sugerenciaPorAlternancia.rutaNombre} ${sugerenciaPorAlternancia.horaSalida}`);
      } else {
        console.log(`🔄 Alternancia mejor que C: ${sugerenciaPorAlternancia.rutaNombre} ${sugerenciaPorAlternancia.horaSalida} está antes que C ${huecoMasTempranoC.horaSalida}`);
      }
    } else if (huecoMasTempranoC && !rutasHechasNombres.includes('C') && !sugerenciaPorAlternancia) {
      // Si no hay sugerencia de alternancia, usar C
      mejorHueco = huecoMasTempranoC;
      console.log(`🔄 No hay alternancia disponible, usando C ${huecoMasTempranoC.horaSalida}`);
    } else if (rutasHechasNombres.includes('C')) {
      console.log(`🔄 C ya hecha, manteniendo sugerencia de alternancia`);
    }

    // PASO 4: Si no hay sugerencia, usar el hueco más temprano
    if (!mejorHueco) {
      const huecosOrdenadosPorTiempo = huecosParaSugerencia.sort((a, b) => 
        new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime()
      );
      mejorHueco = huecosOrdenadosPorTiempo[0];
      console.log(`🔄 No hay sugerencia específica, usando el más temprano: ${mejorHueco.rutaNombre} ${mejorHueco.horaSalida}`);
    }

    // PASO 5: Generar alternativas (excluyendo el mejor hueco)
    const alternativas = huecosParaSugerencia
      .filter(h => h !== mejorHueco)
      .sort((a, b) => {
        const horaA = new Date(a.horaSalida).getTime();
        const horaB = new Date(b.horaSalida).getTime();
        const prioridadA = this.getPrioridadNumerica(a.prioridad);
        const prioridadB = this.getPrioridadNumerica(b.prioridad);
        
        // Ordenar por prioridad primero, luego por tiempo
        if (prioridadA !== prioridadB) {
          return prioridadA - prioridadB;
        }
        return horaA - horaB;
      })
      .slice(0, 3);

    console.log('🎯 Mejor hueco seleccionado:', {
      ruta: mejorHueco.rutaNombre,
      hora: mejorHueco.horaSalida,
      prioridad: mejorHueco.prioridad,
      razon: mejorHueco.razon
    });

    return {
      mejorHueco,
      razon: `Mejor opción: ${mejorHueco.razon}`,
      alternativas
    };
  }

  /**
   * Convierte prioridad a número para ordenamiento
   */
  private getPrioridadNumerica(prioridad: string): number {
    switch (prioridad) {
      case 'ROTACION': return 1;
      case 'MISMA_RUTA': return 2;
      case 'CUALQUIERA': return 3;
      default: return 4;
    }
  }

  /**
   * Crea un nuevo turno
   */
  async crearTurno(movilId: number, conductorId: number, rutaId: number, horaSalida: string, usuarioId?: number | null): Promise<Turno> {
    console.log('🔧 Iniciando crearTurno con parámetros:', { movilId, conductorId, rutaId, horaSalida });
    
    try {
      await this.inicializarConfiguracion();
      console.log('✅ Configuración inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando configuración:', error);
      throw error;
    }
    
    const ahora = TimeService.getCurrentTime();
    const horaSalidaDate = new Date(horaSalida);
    console.log('⏰ Tiempos obtenidos:', { 
      ahora: ahora.toISOString(), 
      horaSalida: horaSalidaDate.toISOString() 
    });

    // Validaciones
    console.log('🔍 Iniciando validaciones...');
    
    if (horaSalidaDate <= ahora) {
      console.error('❌ Error: Hora de salida en el pasado');
      const tiempoPasado = Math.abs((horaSalidaDate.getTime() - ahora.getTime()) / (1000 * 60));
      throw new Error(`No se puede crear un turno con hora de salida en el pasado. La hora seleccionada fue hace ${Math.round(tiempoPasado)} minutos`);
    }
    console.log('✅ Validación de hora en el pasado: OK');

    // Verificar que respete el tiempo mínimo de salida
    const tiempoMinimoSalida = this.configuracion?.tiempoMinimoSalida || 2;
    const tiempoHastaSalida = (horaSalidaDate.getTime() - ahora.getTime()) / (1000 * 60);
    console.log('⏱️ Tiempo mínimo de salida:', tiempoMinimoSalida, 'minutos');
    console.log('⏱️ Tiempo hasta salida:', tiempoHastaSalida, 'minutos');
    
    // Agregar un margen de tolerancia de 1 minuto para compensar el tiempo de procesamiento
    const margenTolerancia = 1; // 1 minuto
    if (tiempoHastaSalida < (tiempoMinimoSalida - margenTolerancia)) {
      console.error('❌ Error: No respeta tiempo mínimo de salida');
      const tiempoFaltante = tiempoMinimoSalida - tiempoHastaSalida;
      
      // Regenerar huecos basados en la hora actual
      console.log('🔄 Regenerando huecos porque el turno no cumple tiempo mínimo...');
      await this.limpiarHuecosAntiguos(ahora);
      await this.generarNuevosHuecos(ahora, movilId, conductorId);
      
      // En lugar de fallar, lanzar un error especial que indique que se regeneraron huecos
      throw new Error(`TIEMPO_INSUFICIENTE_HUECOS_REGENERADOS: El turno debe programarse al menos ${tiempoMinimoSalida} minutos después de la hora actual. Faltan ${Math.round(tiempoFaltante)} minutos. Se han regenerado los huecos basados en la hora actual.`);
    }
    console.log('✅ Validación de tiempo mínimo: OK');

    // Verificar que móvil y conductor estén disponibles
    console.log('🚗 Buscando móvil y conductor en la base de datos...');
    
    try {
      const [movil, conductor] = await Promise.all([
        prisma.automovil.findUnique({ where: { id: movilId } }),
        prisma.conductor.findUnique({ where: { id: conductorId } })
      ]);
      
      console.log('📋 Resultados de búsqueda:', { 
        movil: movil ? { id: movil.id, movil: movil.movil, activo: movil.activo } : null,
        conductor: conductor ? { id: conductor.id, nombre: conductor.nombre, activo: conductor.activo } : null
      });

      if (!movil || !conductor) {
        console.error('❌ Error: Móvil o conductor no encontrado');
        if (!movil) {
          throw new Error(`El móvil con ID ${movilId} no fue encontrado en la base de datos`);
        } else {
          throw new Error(`El conductor con ID ${conductorId} no fue encontrado en la base de datos`);
        }
      }

      if (!movil.activo || !conductor.activo) {
        console.error('❌ Error: Móvil o conductor no está activo');
        if (!movil.activo) {
          throw new Error(`El móvil ${movil.movil} no está activo en el sistema`);
        } else {
          throw new Error(`El conductor ${conductor.nombre} no está activo en el sistema`);
        }
      }
      
      console.log('✅ Validación de móvil y conductor: OK');
    } catch (error) {
      console.error('❌ Error verificando móvil y conductor:', error);
      throw error;
    }

         // Verificación de conflictos de horario deshabilitada
     console.log('🔍 Verificación de conflictos de horario: DESHABILITADA');

    // Crear el turno
    console.log('💾 Creando turno en la base de datos...');
    
    try {
      console.log('🔍 Datos para crear turno:', {
        movilId,
        conductorId,
        rutaId,
        fecha: ahora.toISOString(),
        horaSalida: horaSalidaDate.toISOString(),
        estado: 'PENDIENTE'
      });
      
      const turno = await prisma.turno.create({
        data: {
          movilId,
          conductorId,
          rutaId,
          fecha: ahora,
          horaSalida: horaSalidaDate,
          horaCreacion: ahora,
          estado: 'PENDIENTE',
          usuarioId: usuarioId || null
        },
        include: {
          ruta: true,
          movil: true,
          conductor: true,
          usuario: true
        }
      });
      
      console.log('✅ Turno creado exitosamente:', { 
        id: turno.id, 
        ruta: turno.ruta?.nombre,
        movil: turno.movil?.movil,
        conductor: turno.conductor?.nombre
      });
      
      // Marcar el hueco correspondiente como asignado (sin bloquear si falla)
      try {
        await this.marcarHuecoComoAsignado(rutaId, horaSalidaDate);
        console.log('✅ Hueco marcado como asignado para el turno creado');
      } catch (huecoError) {
        console.error('⚠️ Error marcando hueco como asignado (no crítico):', huecoError);
        // No lanzar el error para no interrumpir la creación del turno
      }
      
      return {
        id: turno.id,
        horaSalida: turno.horaSalida.toISOString(),
        ruta: turno.ruta ? { id: turno.ruta.id, nombre: turno.ruta.nombre } : null,
        movil: { id: turno.movil.id, movil: turno.movil.movil },
        conductor: { id: turno.conductor.id, nombre: turno.conductor.nombre },
        estado: turno.estado || 'PENDIENTE'
      };
    } catch (error) {
      console.error('❌ Error creando turno en la base de datos:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack available'
      });
      throw error;
    }
  }

  /**
   * Obtiene los turnos del día actual
   */
  async obtenerTurnosDelDia(): Promise<Turno[]> {
    const ahora = TimeService.getCurrentTime();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const turnos = await prisma.turno.findMany({
      where: {
        fecha: { gte: inicioDia, lt: finDia }
      },
      include: {
        ruta: true,
        movil: true,
        conductor: true
      },
      orderBy: { horaSalida: 'asc' }
    });

    return turnos.map(turno => ({
      id: turno.id,
      horaSalida: turno.horaSalida.toISOString(),
      ruta: turno.ruta ? { id: turno.ruta.id, nombre: turno.ruta.nombre } : null,
      movil: { id: turno.movil.id, movil: turno.movil.movil },
      conductor: { id: turno.conductor.id, nombre: turno.conductor.nombre },
      estado: turno.estado || 'PENDIENTE'
    }));
  }

  /**
   * Obtiene todas las rutas hechas por un conductor hoy, ordenadas por hora
   */
  async obtenerRutasConductorHoy(conductorId: number): Promise<Turno[]> {
    const ahora = TimeService.getCurrentTime();
    const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    console.log('🔍 Buscando rutas del conductor hoy:', {
      conductorId,
      inicioDia: inicioDia.toISOString(),
      finDia: finDia.toISOString()
    });

    const turnos = await prisma.turno.findMany({
      where: {
        conductorId,
        fecha: { gte: inicioDia, lt: finDia },
        estado: { in: ['PENDIENTE', 'EN_CURSO', 'COMPLETADO'] }
      },
      include: {
        ruta: true,
        movil: true,
        conductor: true
      },
      orderBy: { horaSalida: 'asc' }
    });

    console.log('📋 Rutas encontradas para el conductor:', {
      conductorId,
      totalRutas: turnos.length,
      rutas: turnos.map(t => ({
        hora: t.horaSalida.toISOString(),
        ruta: t.ruta?.nombre,
        movil: t.movil.movil,
        estado: t.estado
      }))
    });

    return turnos.map(turno => ({
      id: turno.id,
      horaSalida: turno.horaSalida.toISOString(),
      ruta: turno.ruta ? { id: turno.ruta.id, nombre: turno.ruta.nombre } : null,
      movil: { id: turno.movil.id, movil: turno.movil.movil },
      conductor: { id: turno.conductor.id, nombre: turno.conductor.nombre },
      estado: turno.estado || 'PENDIENTE'
    }));
  }

  /**
   * Obtiene todas las rutas hechas por un móvil hoy (turnos + programados), ordenadas por hora
   */
  async obtenerRutasMovilHoy(movilId: number): Promise<Turno[]> {
    const ahora = TimeService.getCurrentTime();
    const fechaHoy = ahora.toISOString().split('T')[0];

    console.log('🔍 Buscando rutas del móvil hoy (turnos + programados):', {
      movilId,
      fechaHoy
    });

    // Obtener turnos del móvil
    const todosTurnos = await prisma.turno.findMany({
      where: {
        movilId,
        estado: { in: ['PENDIENTE', 'EN_CURSO', 'COMPLETADO'] }
      },
      include: {
        ruta: true,
        movil: true,
        conductor: true
      },
      orderBy: { horaSalida: 'asc' }
    });

    // Filtrar turnos de hoy
    const turnosHoy = todosTurnos.filter(turno => {
      const fechaTurno = new Date(turno.fecha).toISOString().split('T')[0];
      return fechaTurno === fechaHoy;
    });

    // Obtener programados del móvil
    const todosProgramados = await prisma.programacion.findMany({
      where: {
        movilId,
        disponible: false // Solo los programados asignados
      },
      include: {
        movil: true,
        usuario: true
      },
      orderBy: { hora: 'asc' }
    });

    // Filtrar programados de hoy
    const programadosHoy = todosProgramados.filter(prog => {
      const fechaProgramado = new Date(prog.fecha).toISOString().split('T')[0];
      return fechaProgramado === fechaHoy;
    });

    console.log('📋 Rutas encontradas para el móvil:', {
      movilId,
      totalTurnos: turnosHoy.length,
      totalProgramados: programadosHoy.length,
      fechaHoy
    });

    // Convertir turnos al formato esperado
    const turnosFormateados = turnosHoy.map(turno => ({
      id: turno.id,
      horaSalida: turno.horaSalida.toISOString(),
      ruta: turno.ruta ? { id: turno.ruta.id, nombre: turno.ruta.nombre } : null,
      movil: { id: turno.movil.id, movil: turno.movil.movil },
      conductor: { id: turno.conductor.id, nombre: turno.conductor.nombre },
      estado: turno.estado || 'PENDIENTE',
      tipo: 'turno' as const
    }));

    // Convertir programados al formato esperado
    const programadosFormateados = programadosHoy.map(prog => {
      // Convertir la hora del programado a Date
      let horaProgramado: Date;
      if (typeof prog.hora === 'string') {
        if (prog.hora.includes('T')) {
          horaProgramado = new Date(prog.hora);
        } else {
          // Si viene como HH:MM, usar la fecha de hoy
          const [horas, minutos] = prog.hora.split(':').map(Number);
          horaProgramado = new Date(ahora);
          horaProgramado.setHours(horas, minutos, 0, 0);
        }
      } else {
        horaProgramado = new Date(prog.hora);
      }

      return {
        id: prog.id,
        horaSalida: horaProgramado.toISOString(),
        ruta: { id: 0, nombre: prog.ruta },
        movil: { id: prog.movil.id, movil: prog.movil.movil },
        conductor: { id: 0, nombre: prog.usuario?.nombre || 'Usuario' },
        estado: 'PROGRAMADO',
        tipo: 'programado' as const
      };
    });

    // Combinar y ordenar por hora
    const todasLasRutas = [...turnosFormateados, ...programadosFormateados]
      .sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime());

    console.log('✅ Rutas combinadas y ordenadas:', {
      movilId,
      totalRutas: todasLasRutas.length,
      rutas: todasLasRutas.map(r => ({
        hora: r.horaSalida,
        ruta: r.ruta?.nombre,
        conductor: r.conductor.nombre,
        estado: r.estado,
        tipo: r.tipo
      }))
    });

    return todasLasRutas;
  }

  /**
   * Elimina un turno por ID
   */
  async eliminarTurno(turnoId: number): Promise<void> {
    console.log('🗑️ Eliminando turno:', turnoId);

    // Verificar que el turno existe
    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: {
        ruta: true,
        movil: true,
        conductor: true
      }
    });

    if (!turno) {
      throw new Error(`Turno con ID ${turnoId} no encontrado`);
    }

    console.log('🔍 Turno encontrado para eliminar:', {
      id: turno.id,
      horaSalida: turno.horaSalida.toISOString(),
      ruta: turno.ruta?.nombre,
      movil: turno.movil.movil,
      conductor: turno.conductor.nombre,
      estado: turno.estado
    });

    // Eliminar el turno
    await prisma.turno.delete({
      where: { id: turnoId }
    });

    console.log('✅ Turno eliminado exitosamente:', turnoId);
  }

  /**
   * Obtiene programados disponibles como huecos
   */
  private async obtenerProgramadosDisponiblesComoHuecos(ahora: Date): Promise<HuecoDisponible[]> {
    // Obtener solo la fecha de hoy (YYYY-MM-DD)
    const fechaHoy = ahora.toISOString().split('T')[0];

    console.log('🔍 Buscando programados disponibles como huecos:', {
      fechaHoy,
      ahora: ahora.toISOString()
    });

    // Obtener todos los programados disponibles
    const todosProgramados = await prisma.programacion.findMany({
      where: {
        disponible: true
      },
      orderBy: { hora: 'asc' }
    });

    console.log('🔍 Programados disponibles en BD:', {
      total: todosProgramados.length,
      programados: todosProgramados.map(p => ({
        id: p.id,
        ruta: p.ruta,
        fecha: new Date(p.fecha).toISOString().split('T')[0],
        hora: p.hora,
        disponible: p.disponible,
        movilId: p.movilId
      }))
    });

    // Filtrar programados de hoy
    const programados = todosProgramados.filter(prog => {
      const fechaProgramado = new Date(prog.fecha).toISOString().split('T')[0];
      return fechaProgramado === fechaHoy;
    });

    console.log('📋 Programados encontrados:', programados.length);

    // Convertir programados a huecos, filtrando por hora
    const huecosProgramados: HuecoDisponible[] = [];
    
    for (const programado of programados) {
      try {
        // Convertir la hora del programado a Date usando la fecha del programado
        let horaProgramado: Date;
        
        if (typeof programado.hora === 'string') {
          // Si viene como ISO string
          if (programado.hora.includes('T')) {
            // Extraer solo la hora (HH:MM) del ISO string
            const horaISO = new Date(programado.hora);
            const horas = horaISO.getUTCHours();
            const minutos = horaISO.getUTCMinutes();
            
            // Usar la fecha del programado (no la fecha actual)
            const fechaProgramado = new Date(programado.fecha);
            horaProgramado = new Date(fechaProgramado);
            horaProgramado.setHours(horas, minutos, 0, 0);
          } else {
            // Si viene como HH:MM, usar la fecha del programado
            const [horas, minutos] = programado.hora.split(':').map(Number);
            const fechaProgramado = new Date(programado.fecha);
            horaProgramado = new Date(fechaProgramado);
            horaProgramado.setHours(horas, minutos, 0, 0);
          }
        } else {
          // Si es un Date, extraer la hora y usar la fecha del programado
          const horaDate = new Date(programado.hora);
          const horas = horaDate.getHours();
          const minutos = horaDate.getMinutes();
          
          const fechaProgramado = new Date(programado.fecha);
          horaProgramado = new Date(fechaProgramado);
          horaProgramado.setHours(horas, minutos, 0, 0);
        }

        // Solo incluir si está en el futuro
        const minutosHastaProgramado = Math.round((horaProgramado.getTime() - ahora.getTime()) / (1000 * 60));
        
        // Verificar consistencia: si tiene movilId asignado, no debería estar disponible
        const esRealmenteDisponible = programado.disponible && (!programado.movilId || programado.movilId === -1);
        
        console.log(`🔍 Evaluando programado: ${programado.ruta}`, {
          id: programado.id,
          horaProgramado: horaProgramado.toISOString(),
          ahora: ahora.toISOString(),
          minutosHastaProgramado,
          estaEnFuturo: horaProgramado > ahora,
          disponible: programado.disponible,
          movilId: programado.movilId,
          esRealmenteDisponible
        });
        
        if (esRealmenteDisponible && horaProgramado > ahora) {
          const huecoGenerado = {
            rutaId: 0, // Los programados no tienen rutaId en la tabla Ruta
            rutaNombre: programado.ruta,
            horaSalida: horaProgramado.toISOString(),
            prioridad: 'CUALQUIERA' as const,
            razon: `Programado disponible (${minutosHastaProgramado} min)`,
            frecuenciaCalculada: 0,
            programadoId: programado.id, // Agregar ID para identificación
            tipo: 'programado'
          };
          
          huecosProgramados.push(huecoGenerado);
          
          console.log(`✅ Programado incluido como hueco:`, huecoGenerado);
        } else {
          let razon = '';
          if (!esRealmenteDisponible) {
            if (!programado.disponible) {
              razon = 'No disponible (disponible=false)';
            } else if (programado.movilId) {
              razon = 'Ya asignado (tiene movilId)';
            }
          } else if (horaProgramado <= ahora) {
            razon = minutosHastaProgramado < 0 ? 'Hora ya pasó' : 'Hora presente';
          }
          
          console.log(`❌ Programado excluido: ${programado.ruta} - ${horaProgramado.toISOString()} (${razon})`);
        }
      } catch (error) {
        console.error('❌ Error procesando programado:', programado, error);
      }
    }

    console.log('📊 Huecos de programados creados:', {
      totalProgramados: programados.length,
      huecosCreados: huecosProgramados.length,
      huecosPorRuta: huecosProgramados.reduce((acc, h) => {
        acc[h.rutaNombre] = (acc[h.rutaNombre] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number })
    });

    return huecosProgramados;
  }

  /**
   * Verifica si hay programados para el día actual
   */
  private async verificarProgramadosHoy(ahora: Date): Promise<boolean> {
    // Obtener solo la fecha de hoy (YYYY-MM-DD)
    const fechaHoy = ahora.toISOString().split('T')[0];

    // Obtener todos los programados y filtrar por fecha
    const todosProgramados = await prisma.programacion.findMany({
      select: { fecha: true }
    });

    const programadosHoy = todosProgramados.filter(prog => {
      const fechaProgramado = new Date(prog.fecha).toISOString().split('T')[0];
      return fechaProgramado === fechaHoy;
    });

    console.log('📊 Verificación de programados hoy:', {
      fechaHoy,
      totalProgramados: todosProgramados.length,
      programadosHoy: programadosHoy.length,
      hayProgramados: programadosHoy.length > 0
    });

    return programadosHoy.length > 0;
  }
} 