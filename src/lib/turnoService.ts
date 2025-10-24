import { prisma } from './prisma';
import { TimeService } from './timeService';

export interface Turno {
  id: number;
  horaSalida: string | number; // string para turnos ISO, number para programados
  ruta: { id: number; nombre: string } | null;
  movil: { id: number; movil: string };
  conductor: { id: number; nombre: string };
  estado: string;
}

export interface HuecoDisponible {
  rutaId: number;
  rutaNombre: string;
  horaSalida: string | number; // string para turnos ISO, number para programados
  prioridad: 'ROTACION' | 'MISMA_RUTA' | 'CUALQUIERA';
  razon: string;
  frecuenciaCalculada: number;
}

// Nueva interfaz para huecos almacenados en la base de datos
export interface HuecoDisponibleDB {
  id: number;
  rutaId: number;
  rutaNombre: string;
  hora: number; // Minutos desde medianoche
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
  nombre: string;
  valor: string;
  activo: boolean;
  descripcion: string | null;
  fechaCreacion: Date;
}

export class TurnoService {
  private configuracion: Configuracion | null = null;

  /**
   * Valida que una fecha sea válida y la convierte a string seguro
   */
  private validarFecha(fecha: Date): string {
    if (isNaN(fecha.getTime())) {
      console.error('❌ Error: Fecha inválida detectada');
      return new Date().toISOString(); // Retornar fecha actual como fallback
    }
    return fecha.toISOString();
  }

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
            nombre: 'configuracion_default',
            valor: '2', // tiempoMinimoSalida por defecto
            activo: true,
            descripcion: 'Configuración por defecto',
            fechaCreacion: new Date()
          };
        }

        console.log('✅ Configuración cargada:', {
          tiempoMinimoSalida: this.configuracion.valor,
          configuracion: this.configuracion
        });
      } catch (error) {
        console.error('❌ Error cargando configuración:', error);
        console.warn('⚠️ Usando configuración por defecto debido al error');
        // Usar configuración por defecto en lugar de fallar
        this.configuracion = {
          id: 1,
          nombre: 'configuracion_default',
          valor: '2', // tiempoMinimoSalida por defecto
          activo: true,
          descripcion: 'Configuración por defecto',
          fechaCreacion: new Date()
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

    // Obtener todas las rutas activas para poder evaluar sus propiedades (prioridad, unaVezDia)
    const rutas = await prisma.ruta.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    const hayProgramadosHoy = await this.verificarProgramadosHoy(ahora); // Obtener este estado aquí

    // Verificar si necesitamos generar más huecos
    const huecosPorRuta = huecosExistentes.reduce((acc, hueco) => {
      if (!acc[hueco.rutaNombre]) {
        acc[hueco.rutaNombre] = 0;
      }
      acc[hueco.rutaNombre]++;
      return acc;
    }, {} as { [key: string]: number });

    console.log('📊 Huecos disponibles por ruta:', huecosPorRuta);

    // Verificar si necesitamos generar más huecos
    const rutasConPocosHuecos = Object.entries(huecosPorRuta)
      .filter(([ruta, cantidad]) => cantidad < 5) // Umbral original para prioridad 1
      .map(([ruta]) => ruta);

    // Para rutas de prioridad 0 (como C), queremos garantizar que siempre haya suficientes huecos si hay programados hoy.
    // Asumimos que para estas rutas, siempre generamos 10 huecos.
    const rutasPrioridad0ConPocosHuecos = Object.entries(huecosPorRuta)
      .filter(([rutaNombre, cantidad]) => {
        const rutaObj = rutas.find(r => r.nombre === rutaNombre);
        return rutaObj?.prioridad === 0 && cantidad < 10; // Para prioridad 0, verificar si tenemos menos de 10
      })
      .map(([ruta]) => ruta);

    // FORZAR regeneración si:
    // 1. No hay huecos existentes.
    // 2. Hay rutas (prioridad 1) con pocos huecos (<5).
    // 3. Hay programados hoy Y rutas de prioridad 0 (Despacho C) tienen menos de 10 huecos (su target).
    if (huecosExistentes.length === 0 ||
      rutasConPocosHuecos.length > 0 ||
      (hayProgramadosHoy && rutasPrioridad0ConPocosHuecos.length > 0)) {
      console.log('🔄 Necesitamos generar más huecos:', {
        totalHuecos: huecosExistentes.length,
        rutasConPocosHuecos,
        rutasPrioridad0ConPocosHuecos,
        hayProgramadosHoy,
        huecosPorRuta
      });

      // Verificar si hay huecos en la base de datos que estén en el pasado
      // Como HuecoDisponible no tiene fecha, verificamos solo por hora
      const horaActual = ahora.getHours() * 60 + ahora.getMinutes(); // Convertir a minutos

      const huecosEnBD = await prisma.huecoDisponible.findMany({
        orderBy: { hora: 'asc' }
      });

      // Si hay huecos en BD pero todos están en el pasado, limpiarlos y generar nuevos
      if (huecosEnBD.length > 0) {
        const todosEnPasado = huecosEnBD.every(hueco => hueco.hora < horaActual);
        if (todosEnPasado) {
          console.log('🧹 Todos los huecos están en el pasado, limpiando y regenerando...');
          await this.limpiarHuecosAntiguos(ahora);
        }
      }

      console.log('🔄 Generando huecos adicionales...');
      await this.generarNuevosHuecos(ahora, movilId, conductorId, rutas); // Pasar rutas

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
    // Validar configuración primero
    if (!this.configuracion) {
      console.log('⚠️ Configuración no cargada, inicializando...');
      await this.inicializarConfiguracion();
    }

    // Validar y obtener tiempo mínimo con fallback robusto
    const valorConfig = this.configuracion?.valor;
    const tiempoMinimoSalida = valorConfig ? parseInt(valorConfig) : 2;

    // Verificar que sea un número válido
    const tiempoFinal = isNaN(tiempoMinimoSalida) ? 2 : tiempoMinimoSalida;

    const margenTolerancia = 1; // 1 minuto para ser consistente con crearTurno
    const horaMinima = new Date(ahora);
    horaMinima.setMinutes(horaMinima.getMinutes() + margenTolerancia); // Solo sumar margen pequeño

    console.log('⏰ Calculando filtro de tiempo:', {
      ahora: this.validarFecha(ahora),
      horaMinima: this.validarFecha(horaMinima),
      valorConfiguracion: valorConfig,
      tiempoMinimoSalida: tiempoFinal,
      margenTolerancia,
      configuracionCargada: !!this.configuracion
    });

    // Obtener huecos de la base de datos
    const huecosDB = await this.obtenerHuecosDeDB(ahora);

    // Obtener rutas que este móvil ya hizo hoy (solo para información de debug)
    const rutasHechasHoy = await this.obtenerRutasHechasPorMovilHoy(movilId, ahora);

    console.log('🔍 Rutas hechas por móvil hoy:', {
      movilId,
      rutasHechas: rutasHechasHoy
    });

    // Procesar huecos y calcular prioridades correctamente
    const huecosProcesados = await Promise.all(huecosDB.map(async (hueco) => {
      const horaHueco = this.convertirMinutosAHora(hueco.hora);
      const ruta = { prioridad: 0, nombre: hueco.rutaNombre }; // La prioridad se calcula dinámicamente

      // Calcular prioridad basada en las reglas de negocio
      const prioridadCalculada = await this.calcularPrioridad(ruta, horaHueco, movilId);
      const razonCalculada = await this.generarRazon(ruta, horaHueco, movilId);

      return {
        id: hueco.id,
        rutaId: hueco.rutaId,
        rutaNombre: hueco.rutaNombre,
        horaSalida: this.validarFecha(horaHueco),
        prioridad: prioridadCalculada,
        razon: razonCalculada,
        frecuenciaCalculada: 1,
        fecha: new Date(),
        activo: true
      };
    }));

    // Filtrar huecos que respeten el tiempo mínimo y que no estén asignados
    // NO filtrar por rutas hechas - mostrar TODOS los huecos disponibles
    // Usar tiempo mínimo más conservador
    const tiempoMinimoConMargen = new Date(ahora);
    tiempoMinimoConMargen.setMinutes(tiempoMinimoConMargen.getMinutes() + tiempoFinal);

    console.log('🕐 Filtro de tiempo aplicado:', {
      ahora: this.validarFecha(ahora),
      tiempoMinimoFinal: tiempoFinal,
      horaLimite: this.validarFecha(tiempoMinimoConMargen)
    });

    const huecosFiltrados = huecosProcesados
      .filter(hueco => {
        const horaHueco = new Date(hueco.horaSalida);
        const cumpleTiempoMinimo = horaHueco >= tiempoMinimoConMargen;
        const noAsignado = hueco.activo;

        if (!cumpleTiempoMinimo) {
          console.log(`❌ Hueco descartado por tiempo mínimo: ${hueco.rutaNombre} - ${this.validarFecha(horaHueco)} (límite: ${this.validarFecha(tiempoMinimoConMargen)})`);
        }
        if (!noAsignado) {
          console.log(`❌ Hueco descartado por estar asignado: ${hueco.rutaNombre} - ${this.validarFecha(horaHueco)}`);
        }

        return cumpleTiempoMinimo && noAsignado;
      })
      .sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime())
      .map(hueco => ({
        rutaId: hueco.rutaId,
        rutaNombre: hueco.rutaNombre,
        horaSalida: hueco.horaSalida,
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
      inicioDia: this.validarFecha(inicioDia),
      finDia: this.validarFecha(finDia),
      ahora: this.validarFecha(ahora)
    });

    // Usar consulta SQL directa con los campos correctos del esquema
    const huecos = await prisma.$queryRaw`
      SELECT h.id, h."rutaId", h.hora, r.nombre as "rutaNombre", r.prioridad
      FROM "HuecoDisponible" h
      JOIN "Ruta" r ON h."rutaId" = r.id
      WHERE r.activo = true
      ORDER BY h.hora ASC
    ` as (HuecoDisponibleDB & { prioridad: number | null })[];

    console.log('📋 Huecos encontrados en la base de datos:', huecos.length);

    return huecos;
  }

  /**
   * Genera nuevos huecos y los almacena en la base de datos
   */
  private async generarNuevosHuecos(ahora: Date, movilId: number, conductorId: number, rutas?: any[]): Promise<void> {
    console.log('🔄 Generando nuevos huecos GLOBALES...');

    // Obtener todas las rutas activas si no se pasaron como argumento
    const rutasActivas = rutas || await prisma.ruta.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });

    console.log('📋 Rutas activas encontradas:', rutasActivas.map(r => r.nombre));

    // Generar huecos alternados respetando las frecuencias de las rutas
    // Los huecos son GLOBALES, no específicos de un móvil/conductor
    console.log('🎯 LLAMANDO A generarHuecosAlternados CON VALIDACIONES HORARIAS...');
    const huecos = await this.generarHuecosAlternados(rutasActivas, ahora, movilId, conductorId);
    console.log('🎯 RETORNADO DE generarHuecosAlternados, huecos generados:', huecos.length);

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
      // Primero, eliminar huecos duplicados existentes
      // Como HuecoDisponible no tiene fecha, eliminamos todos los huecos existentes
      await prisma.$executeRaw`
        DELETE FROM "HuecoDisponible"
      `;

      console.log('🗑️ Huecos existentes eliminados para evitar duplicados');

      // Ahora insertar los nuevos huecos
      for (const hueco of huecos) {
        try {
          // Convertir la hora de salida a minutos desde medianoche
          const horaSalidaDate = new Date(hueco.horaSalida);
          const minutos = horaSalidaDate.getHours() * 60 + horaSalidaDate.getMinutes();

          await prisma.$executeRaw`
            INSERT INTO "HuecoDisponible" ("rutaId", hora)
            VALUES (${hueco.rutaId}, ${minutos})
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

      // Como HuecoDisponible no tiene horaSalida ni activo, 
      // simplemente eliminamos el hueco que coincide con la ruta y hora
      const horaMinutos = horaSalida.getHours() * 60 + horaSalida.getMinutes();

      const resultado = await prisma.huecoDisponible.deleteMany({
        where: {
          rutaId: rutaId,
          hora: horaMinutos
        }
      });

      console.log('🔒 Hueco marcado como asignado:', {
        rutaId,
        horaSalida: this.validarFecha(horaSalida),
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

      // Como HuecoDisponible no tiene campo fecha, no podemos limpiar por fecha
      // Solo podemos limpiar huecos que están en el pasado (hora actual)
      const horaActual = ahora.getHours() * 60 + ahora.getMinutes(); // Convertir a minutos

      const resultadoPasado = await prisma.$executeRaw`
        DELETE FROM "HuecoDisponible"
        WHERE hora < ${horaActual}
      `;

      if (resultadoPasado > 0) {
        console.log('🧹 Huecos en el pasado limpiados:', resultadoPasado, 'huecos eliminados');
      }
    } catch (error) {
      console.error('❌ Error limpiando huecos antiguos:', error);
    }
  }

  /**
   * Convierte minutos desde medianoche a una fecha con hora
   */
  private convertirMinutosAHora(minutos: number): Date {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    const fecha = new Date();
    fecha.setHours(horas, mins, 0, 0);
    return fecha;
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
        estado: { in: ['COMPLETADO', 'NO_COMPLETADO'] }
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
   * Valida si una hora está en un rango horario restringido para una ruta específica
   * Usa zona horaria de Bogotá para manejar correctamente las horas en Vercel
   */
  private estaEnRangoRestringido(hora: Date, rutaNombre: string): boolean {
    const { hours, minutes, date: horaBogotaDate } = this.getHoraBogota(hora);
    const horaDecimal = hours + minutes / 60;

    const horaTexto = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Log detallado para depuración
    console.log(`🔍 VALIDACIÓN HORARIA:`, {
      rutaNombre,
      horaOriginal: hora.toISOString(),
      horaBogota: horaTexto,
      hours,
      minutes,
      horaDecimal,
      esDespachoA: rutaNombre === 'A' || rutaNombre === 'Despacho A',
      esDespachoC: rutaNombre === 'C' || rutaNombre === 'Despacho C'
    });

    // Restricciones para Despacho A y B: antes de 7:00 AM y entre 17:00-20:30
    if (rutaNombre === 'A' || rutaNombre === 'Despacho A' || rutaNombre === 'B' || rutaNombre === 'Despacho B') {
      // Restricción matutina: antes de 7:00 AM
      const antesDeSeisAM = horaDecimal < 7.0;
      // Restricción vespertina: entre 17:00 y 20:30 (solo para A)
      const entreVespertino = (rutaNombre === 'A' || rutaNombre === 'Despacho A') && (horaDecimal >= 17.0 && horaDecimal <= 20.5);

      const estaRestringida = antesDeSeisAM || entreVespertino;

      console.log(`📋 ${rutaNombre} - Hora: ${horaTexto}, Decimal: ${horaDecimal}, AntesDE7AM: ${antesDeSeisAM}, Vespertino: ${entreVespertino}, Restringida: ${estaRestringida}`);

      if (estaRestringida) {
        const motivo = antesDeSeisAM ? 'antes de 7:00 AM' : 'entre 17:00 y 20:30';
        console.log(`🚫 HORA RESTRINGIDA para ${rutaNombre}: ${horaTexto} (${motivo})`);
        return true;
      }
    }

    // Restricciones para Despacho C: antes de 8:30 AM y entre 19:00-20:30
    if (rutaNombre === 'C' || rutaNombre === 'Despacho C') {
      // Restricción matutina: antes de 8:30 AM
      const antesDeOchoTreinta = horaDecimal < 8.5;
      // Restricción vespertina: entre 19:00 y 20:30
      const entreVespertino = horaDecimal >= 19.0 && horaDecimal <= 20.5;

      const estaRestringida = antesDeOchoTreinta || entreVespertino;

      console.log(`📋 Despacho C - Hora: ${horaTexto}, Decimal: ${horaDecimal}, AntesDe8:30AM: ${antesDeOchoTreinta}, Vespertino: ${entreVespertino}, Restringida: ${estaRestringida}`);

      if (estaRestringida) {
        const motivo = antesDeOchoTreinta ? 'antes de 8:30 AM' : 'entre 19:00 y 20:30';
        console.log(`🚫 HORA RESTRINGIDA para ${rutaNombre}: ${horaTexto} (${motivo})`);
        return true;
      }
    }

    console.log(`✅ Hora permitida para ${rutaNombre}: ${horaTexto}`);
    return false;
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

    console.log('🚨🚨🚨 GENERANDO HUECOS CON VALIDACIONES HORARIAS ACTIVADAS 🚨🚨🚨');
    console.log('🔍 DEBUG generarHuecosAlternados:', {
      ahora: this.validarFecha(ahora),
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

      if (ultimoTurnoPrioridad1 && ultimoTurnoPrioridad1.horaSalida) {
        // Si hay un último turno de prioridad 1, calcular desde ese turno + frecuencia de la ruta
        horaInicio = new Date(ultimoTurnoPrioridad1.horaSalida);

        // Validar que la fecha sea válida
        if (isNaN(horaInicio.getTime())) {
          console.error('❌ Error: horaSalida inválida del último turno de prioridad 1:', ultimoTurnoPrioridad1.horaSalida);
          horaInicio = new Date(ahora);
        } else {
          // Usar la frecuencia de la ruta que NO fue la última (para alternar)
          const rutaAlternativa = rutasPrioridad1.find(r => r.nombre !== ultimoTurnoPrioridad1.ruta?.nombre);
          const frecuencia = rutaAlternativa?.frecuenciaActual || 6; // Default 6 minutos
          horaInicio.setMinutes(horaInicio.getMinutes() + frecuencia);

          console.log('⏰ Calculando hora de inicio para rutas A/B basada en último turno de prioridad 1:', {
            ultimoTurno: this.validarFecha(ultimoTurnoPrioridad1.horaSalida),
            ultimaRuta: ultimoTurnoPrioridad1.ruta?.nombre,
            rutaAlternativa: rutaAlternativa?.nombre,
            frecuencia,
            horaInicio: this.validarFecha(horaInicio)
          });
        }

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
        const valorConfig = this.configuracion?.valor;
        const tiempoMinimoSalida = valorConfig ? parseInt(valorConfig) : 5;
        const tiempoFinal = isNaN(tiempoMinimoSalida) ? 5 : tiempoMinimoSalida;
        const margenAdicional = 1;
        // Usar la hora de Bogotá para la hora de inicio
        let { date: ahoraBogota } = this.getHoraBogota(ahora);
        horaInicio = new Date(ahoraBogota);
        horaInicio.setMinutes(horaInicio.getMinutes() + tiempoFinal + margenAdicional);

        // Aplicar restricción horaria para rutas A y B si hay programados
        if (hayProgramadosHoy) {
          const restriccionHora = new Date(ahoraBogota);
          restriccionHora.setHours(7, 0, 0, 0); // 7:00 AM

          if (horaInicio < restriccionHora) {
            horaInicio = new Date(restriccionHora);
            console.log('🚫 Aplicando restricción horaria A/B: turnos inician a las 7:00 AM cuando hay programados');
          }
        }

        console.log('⏰ Calculando hora de inicio para rutas A/B basada en tiempo mínimo:', {
          ahora: this.validarFecha(ahora),
          ahoraBogota: this.validarFecha(ahoraBogota),
          tiempoMinimoSalida: tiempoFinal,
          margenAdicional,
          horaInicio: this.validarFecha(horaInicio),
          hayProgramados: hayProgramadosHoy,
          restriccionAplicada: hayProgramadosHoy && horaInicio.getHours() >= 7
        });
      }

      // Validación final de horaInicio antes de continuar
      if (isNaN(horaInicio.getTime())) {
        console.error('❌ Error: horaInicio es inválida después de todos los cálculos, usando hora actual + tiempo mínimo');
        const valorConfig = this.configuracion?.valor;
        const tiempoMinimoSalida = valorConfig ? parseInt(valorConfig) : 5;
        const tiempoFinal = isNaN(tiempoMinimoSalida) ? 5 : tiempoMinimoSalida;
        horaInicio = new Date(ahora);
        horaInicio.setMinutes(horaInicio.getMinutes() + tiempoFinal);
      }

      // Verificar que la hora de inicio esté en el futuro
      if (horaInicio <= ahora) {
        console.log('⚠️ Hora de inicio está en el pasado, ajustando a hora actual');
        const valorConfig = this.configuracion?.valor;
        const tiempoMinimoSalida = valorConfig ? parseInt(valorConfig) : 5;
        const tiempoFinal = isNaN(tiempoMinimoSalida) ? 5 : tiempoMinimoSalida;
        const margenAdicional = 1;
        horaInicio = new Date(ahora);
        horaInicio.setMinutes(horaInicio.getMinutes() + tiempoFinal + margenAdicional);

        // Validar que la fecha sea válida antes de llamar toISOString()
        if (isNaN(horaInicio.getTime())) {
          console.error('❌ Error: Fecha inválida generada, usando hora actual + 5 minutos');
          horaInicio = new Date(ahora.getTime() + 5 * 60 * 1000); // 5 minutos en el futuro
        }

        console.log('✅ Nueva hora de inicio:', this.validarFecha(horaInicio));
      }

      // Generar huecos alternados para rutas A y B - asegurar balance
      let horaActual = new Date(horaInicio);
      const huecosPorRuta = 10; // Exactamente 10 huecos por ruta
      const totalHuecos = rutasPrioridad1.length * huecosPorRuta;

      console.log('🎯 DEBUG horaActual para generar huecos:', {
        horaInicio: isNaN(horaInicio.getTime()) ? 'Fecha inválida' : horaInicio.toISOString(),
        horaActual: isNaN(horaActual.getTime()) ? 'Fecha inválida' : this.validarFecha(horaActual),
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
            console.log(`⚠️ Conflicto detectado: ${ruta.nombre} ${this.validarFecha(horaActual)} vs ${turno.ruta?.nombre} ${turno.horaSalida} (${diferencia} min)`);
          }

          return esConflicto;
        });

        // Verificar restricciones horarias para rutas específicas
        const estaRestringida = this.estaEnRangoRestringido(horaActual, ruta.nombre);

        console.log(`🎯 [PRIORIDAD 1] Evaluando hueco para ${ruta.nombre}:`, {
          hora: horaActual.toISOString(),
          hayConflicto,
          estaRestringida,
          seGenerara: !hayConflicto && !estaRestringida
        });

        if (!hayConflicto && !estaRestringida) {
          huecos.push({
            rutaId: ruta.id,
            rutaNombre: ruta.nombre,
            horaSalida: this.validarFecha(horaActual),
            prioridad: await this.calcularPrioridad(ruta, horaActual, movilId),
            razon: await this.generarRazon(ruta, horaActual, movilId),
            frecuenciaCalculada: ruta.frecuenciaActual
          });
          huecosGenerados++;
          console.log(`✅ [PRIORIDAD 1] Hueco generado para ${ruta.nombre} a las ${horaActual.toISOString()}`);
        } else {
          console.log(`❌ [PRIORIDAD 1] Hueco NO generado para ${ruta.nombre} - Conflicto: ${hayConflicto}, Restringida: ${estaRestringida}`);
        }

        // Avanzar al siguiente hueco usando la frecuencia de la ruta actual
        const horaAnterior = new Date(horaActual);
        horaActual = new Date(horaActual);
        horaActual.setMinutes(horaActual.getMinutes() + ruta.frecuenciaActual);

        // Validar que la nueva fecha sea válida
        if (isNaN(horaActual.getTime())) {
          console.error(`❌ Error: Fecha inválida generada para ${ruta.nombre}, usando hora anterior + 5 minutos`);
          horaActual = new Date(horaAnterior.getTime() + 5 * 60 * 1000);
        }

        const tiempoTranscurrido = (horaActual.getTime() - horaAnterior.getTime()) / (1000 * 60);
        console.log(`🔄 Avanzando ${ruta.frecuenciaActual} minutos para ${ruta.nombre}: ${this.validarFecha(horaActual)}`);
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
          const valorConfig = this.configuracion?.valor;
          const tiempoMinimoSalida = valorConfig ? parseInt(valorConfig) : 5;
          const tiempoFinal = isNaN(tiempoMinimoSalida) ? 5 : tiempoMinimoSalida;
          const margenAdicional = 1;
          // Usar la hora de Bogotá para la hora de inicio
          let { date: ahoraBogota } = this.getHoraBogota(ahora);
          horaInicioRuta = new Date(ahoraBogota);
          horaInicioRuta.setMinutes(horaInicioRuta.getMinutes() + tiempoFinal + margenAdicional);

          // Aplicar restricción horaria para ruta C si hay programados
          if (hayProgramadosHoy && ruta.nombre === 'C') {
            const restriccionHoraC = new Date(ahoraBogota);
            restriccionHoraC.setHours(8, 30, 0, 0); // 8:30 AM

            if (horaInicioRuta < restriccionHoraC) {
              horaInicioRuta = new Date(restriccionHoraC);
              console.log('🚫 Aplicando restricción horaria C: turnos inician a las 8:30 AM cuando hay programados');
            }
          }

          console.log(`⏰ Calculando hora de inicio para ${ruta.nombre} basada en tiempo mínimo:`, {
            ahora: this.validarFecha(ahora),
            ahoraBogota: this.validarFecha(ahoraBogota),
            tiempoMinimoSalida: tiempoFinal,
            margenAdicional,
            horaInicioRuta: this.validarFecha(horaInicioRuta),
            hayProgramados: hayProgramadosHoy,
            restriccionAplicada: hayProgramadosHoy && ruta.nombre === 'C' && horaInicioRuta.getHours() >= 8
          });
        }
      } else {
        // Si no hay turnos existentes, usar tiempo mínimo
        const valorConfig = this.configuracion?.valor;
        const tiempoMinimoSalida = valorConfig ? parseInt(valorConfig) : 5;
        const tiempoFinal = isNaN(tiempoMinimoSalida) ? 5 : tiempoMinimoSalida;
        const margenAdicional = 1;
        let { date: ahoraBogota } = this.getHoraBogota(ahora);
        horaInicioRuta = new Date(ahoraBogota);
        horaInicioRuta.setMinutes(horaInicioRuta.getMinutes() + tiempoFinal + margenAdicional);

        // Aplicar restricción horaria para ruta C si hay programados
        if (hayProgramadosHoy && ruta.nombre === 'C') {
          const restriccionHoraC = new Date(ahoraBogota);
          restriccionHoraC.setHours(8, 30, 0, 0); // 8:30 AM

          if (horaInicioRuta < restriccionHoraC) {
            horaInicioRuta = new Date(restriccionHoraC);
            console.log('🚫 Aplicando restricción horaria C: turnos inician a las 8:30 AM cuando hay programados');
          }
        }

        console.log(`⏰ Calculando hora de inicio para ${ruta.nombre} basada en tiempo mínimo:`, {
          ahora: this.validarFecha(ahora),
          ahoraBogota: this.validarFecha(ahoraBogota),
          tiempoMinimoSalida: tiempoFinal,
          margenAdicional,
          horaInicioRuta: this.validarFecha(horaInicioRuta),
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
            console.log(`⚠️ Conflicto detectado: ${ruta.nombre} ${this.validarFecha(horaActual)} vs ${turno.ruta?.nombre} ${turno.horaSalida} (${diferencia} min)`);
          }

          return esConflicto;
        });

        // Verificar restricciones horarias para rutas específicas
        const estaRestringida = this.estaEnRangoRestringido(horaActual, ruta.nombre);

        console.log(`🎯 [PRIORIDAD 0] Evaluando hueco para ${ruta.nombre}:`, {
          hora: horaActual.toISOString(),
          hayConflicto,
          estaRestringida,
          seGenerara: !hayConflicto && !estaRestringida
        });

        if (!hayConflicto && !estaRestringida) {
          huecos.push({
            rutaId: ruta.id,
            rutaNombre: ruta.nombre,
            horaSalida: this.validarFecha(horaActual),
            prioridad: await this.calcularPrioridad(ruta, horaActual, movilId),
            razon: await this.generarRazon(ruta, horaActual, movilId),
            frecuenciaCalculada: ruta.frecuenciaActual
          });
          huecosGenerados++;
          console.log(`✅ [PRIORIDAD 0] Hueco generado para ${ruta.nombre} a las ${horaActual.toISOString()}`);
        } else {
          console.log(`❌ [PRIORIDAD 0] Hueco NO generado para ${ruta.nombre} - Conflicto: ${hayConflicto}, Restringida: ${estaRestringida}`);
        }

        // Avanzar usando la frecuencia de esta ruta específica
        const horaAnterior = new Date(horaActual);
        horaActual = new Date(horaActual);
        horaActual.setMinutes(horaActual.getMinutes() + ruta.frecuenciaActual);

        // Validar que la nueva fecha sea válida
        if (isNaN(horaActual.getTime())) {
          console.error(`❌ Error: Fecha inválida generada para ${ruta.nombre} (independiente), usando hora anterior + 5 minutos`);
          horaActual = new Date(horaAnterior.getTime() + 5 * 60 * 1000);
        }

        const tiempoTranscurrido = (horaActual.getTime() - horaAnterior.getTime()) / (1000 * 60);
        console.log(`🔄 Avanzando ${ruta.frecuenciaActual} minutos para ${ruta.nombre} (independiente): ${this.validarFecha(horaActual)}`);
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
    const valorConfig = this.configuracion?.valor;
    const tiempoMinimoSalida = valorConfig ? parseInt(valorConfig) : 5;
    const tiempoFinal = isNaN(tiempoMinimoSalida) ? 5 : tiempoMinimoSalida;

    console.log('🔍 DEBUG generarHuecosParaRuta:', {
      ruta: ruta.nombre,
      ahora: ahora.toISOString(),
      tiempoMinimoSalida: tiempoFinal
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
    horaInicio.setMinutes(horaInicio.getMinutes() + tiempoFinal);

    console.log('⏰ DEBUG horaInicio calculada:', {
      ahora: ahora.toISOString(),
      horaInicio: horaInicio.toISOString(),
      tiempoMinimoSalida: tiempoFinal
    });

    console.log('⏰ Generando huecos para ruta:', ruta.nombre, {
      ahora: ahora.toISOString(),
      tiempoMinimoSalida: tiempoFinal,
      horaInicio: horaInicio.toISOString(),
      turnosExistentes: turnosExistentes.length
    });

    // Si hay turnos existentes, calcular huecos entre ellos
    if (turnosExistentes.length > 0) {
      for (let i = 0; i < turnosExistentes.length; i++) {
        const turnoActual = turnosExistentes[i];
        const turnoSiguiente = turnosExistentes[i + 1];

        const horaHueco = new Date(turnoActual.horaSalida);
        horaHueco.setMinutes(horaHueco.getMinutes() + tiempoFinal);
        let esPrimerHueco = true;

        // Generar huecos hasta el siguiente turno o hasta completar 10
        while (huecos.length < 10 &&
          (!turnoSiguiente || horaHueco < new Date(turnoSiguiente.horaSalida))) {

          if (horaHueco >= horaInicio) {
            // Calcular prioridad basada en las reglas de negocio
            const prioridadCalculada = await this.calcularPrioridad(ruta, horaHueco, movilId);
            const razonCalculada = await this.generarRazon(ruta, horaHueco, movilId);

            huecos.push({
              rutaId: ruta.id,
              rutaNombre: ruta.nombre,
              horaSalida: horaHueco.toISOString(),
              prioridad: prioridadCalculada,
              razon: razonCalculada,
              frecuenciaCalculada: esPrimerHueco ? tiempoFinal : ruta.frecuenciaActual
            });
          }

          // Para el primer hueco usar tiempo mínimo, para los siguientes usar frecuencia
          if (esPrimerHueco) {
            horaHueco.setMinutes(horaHueco.getMinutes() + tiempoFinal);
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
        horaHueco.setMinutes(horaHueco.getMinutes() + tiempoFinal);

        console.log('🔍 DEBUG último turno existente:', {
          ultimoTurno: turnosExistentes[turnosExistentes.length - 1].horaSalida,
          horaHuecoCalculada: horaHueco.toISOString(),
          ahora: ahora.toISOString()
        });

        // Si el último turno está en el pasado, empezar desde la hora actual
        if (horaHueco <= ahora) {
          console.log('⚠️ Último turno está en el pasado, usando hora actual');
          horaHueco = new Date(ahora);
          horaHueco.setMinutes(horaHueco.getMinutes() + tiempoFinal);
        }
      } else {
        // No hay turnos existentes, empezar desde la hora actual
        console.log('🆕 No hay turnos existentes, usando hora actual');
        horaHueco = new Date(ahora);
        horaHueco.setMinutes(horaHueco.getMinutes() + tiempoFinal);
      }

      console.log('🎯 DEBUG horaHueco final para generar:', horaHueco.toISOString());

      while (huecos.length < 10) {
        console.log(`✅ Generando hueco ${huecos.length + 1}: ${horaHueco.toISOString()}`);

        // Calcular prioridad basada en las reglas de negocio
        const prioridadCalculada = await this.calcularPrioridad(ruta, horaHueco, movilId);
        const razonCalculada = await this.generarRazon(ruta, horaHueco, movilId);

        huecos.push({
          rutaId: ruta.id,
          rutaNombre: ruta.nombre,
          horaSalida: horaHueco.toISOString(),
          prioridad: prioridadCalculada,
          razon: razonCalculada,
          frecuenciaCalculada: esPrimerHueco ? tiempoFinal : ruta.frecuenciaActual
        });

        // Para el primer hueco usar tiempo mínimo, para los siguientes usar frecuencia
        if (esPrimerHueco) {
          horaHueco.setMinutes(horaHueco.getMinutes() + tiempoFinal);
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
    // Prioridad 0 = ruta más cercana (CUALQUIERA)
    if (ruta.prioridad === 0) {
      return 'CUALQUIERA';
    }

    // Prioridad 1 = intercalar rutas (A y B) - ROTACION por defecto
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
            horaSalida: { lte: this.getHoraBogota(ahora).date }, // Solo turnos que ya ocurrieron o están ocurriendo
            ruta: { prioridad: 1 } // Solo rutas A y B
          },
          include: { ruta: true },
          orderBy: { horaSalida: 'desc' }
        }),
        prisma.programacion.findFirst({
          where: {
            automovilId: movilId,
            fecha: { gte: inicioDia, lt: finDia },
            hora: { lte: this.convertirDateANumeroHora(this.getHoraBogota(ahora).date) }, // Solo programados que ya ocurrieron o están ocurriendo
            ruta: { nombre: { in: ['Despacho A', 'Despacho B'] } } // Programados equivalentes a A y B
          },
          include: { ruta: true },
          orderBy: { hora: 'desc' }
        })
      ]);

      // Determinar cuál fue el último evento de prioridad 1
      let ultimoEvento: { ruta: string; hora: Date; tipo: 'turno' | 'programado' } | null = null;

      if (ultimoTurno && ultimoProgramado) {
        const horaUltimoTurno = new Date(ultimoTurno.horaSalida);
        const horaUltimoProgramado = this.convertirNumeroHoraADate(ultimoProgramado.hora, ultimoProgramado.fecha); // Convertir número hora a Date

        if (horaUltimoTurno > horaUltimoProgramado) {
          ultimoEvento = {
            ruta: ultimoTurno.ruta?.nombre || '',
            hora: horaUltimoTurno,
            tipo: 'turno'
          };
        } else {
          ultimoEvento = {
            ruta: ultimoProgramado.ruta?.nombre === 'Despacho A' ? 'A' : 'B',
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
          ruta: ultimoProgramado.ruta?.nombre === 'Despacho A' ? 'A' : 'B',
          hora: this.convertirNumeroHoraADate(ultimoProgramado.hora, ultimoProgramado.fecha),
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

    // Para cualquier otra prioridad, usar ROTACION por defecto
    return 'ROTACION';
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
      const ahoraBogotaDate = this.getHoraBogota(ahora).date;

      // Crear fechas para el inicio y fin del día actual
      const inicioDiaActual = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
      const finDiaActual = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);

      // Verificar si este móvil ya hizo esta ruta en su último turno (SOLO rutas A y B)
      const ultimoTurnoMovil = await prisma.turno.findFirst({
        where: {
          movilId,
          fecha: {
            gte: inicioDiaActual,
            lt: finDiaActual
          },
          horaSalida: { lte: ahoraBogotaDate }, // Solo turnos que ya ocurrieron o están ocurriendo
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
        estado: { in: ['COMPLETADO', 'NO_COMPLETADO'] }
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

    // Obtener la hora actual de Bogotá para filtrar eventos futuros
    const ahoraBogotaDate = this.getHoraBogota(ahora).date;

    // Crear fechas para el inicio y fin del día actual
    const inicioDiaActual = new Date(ahoraBogotaDate.getFullYear(), ahoraBogotaDate.getMonth(), ahoraBogotaDate.getDate());
    const finDiaActual = new Date(ahoraBogotaDate.getFullYear(), ahoraBogotaDate.getMonth(), ahoraBogotaDate.getDate() + 1);

    console.log('📅 Filtro de fecha en asignacionAutomatica:', {
      inicioDiaActual: inicioDiaActual.toISOString(),
      finDiaActual: finDiaActual.toISOString(),
      fechaHoy: fechaHoy
    });

    // Obtener turnos del día
    const todosTurnosHoy = await prisma.turno.findMany({
      where: {
        movilId,
        fecha: {
          gte: inicioDiaActual,
          lt: finDiaActual
        },
        horaSalida: { lte: ahoraBogotaDate }, // Solo turnos que ya ocurrieron o están ocurriendo
        estado: { in: ['COMPLETADO', 'NO_COMPLETADO'] }
      },
      include: { ruta: true },
      orderBy: { horaSalida: 'desc' }
    });

    // Los turnos ya están filtrados por fecha y hora
    const turnosHoy = todosTurnosHoy;

    // Obtener programados del día para este móvil
    const todosProgramadosHoy = await prisma.programacion.findMany({
      where: {
        automovilId: movilId,
        fecha: {
          gte: inicioDiaActual,
          lt: finDiaActual
        },
        hora: { lte: this.convertirDateANumeroHora(ahoraBogotaDate) } // Solo programados que ya ocurrieron o están ocurriendo
      },
      include: { ruta: true },
      orderBy: { hora: 'desc' }
    });

    // Los programados ya están filtrados por fecha y hora
    const programadosHoy = todosProgramadosHoy;

    // Combinar rutas hechas de turnos y programados
    const rutasHechasTurnos = turnosHoy.map(t => t.ruta?.nombre).filter(Boolean);
    const rutasHechasProgramados = programadosHoy.map(p => {
      const nombreRuta = p.ruta?.nombre || '';
      console.log('🔍 Mapeando programado:', { ruta: p.ruta, nombreRuta, id: p.id });

      // Mapear nombres de programados a nombres cortos para comparación
      if (nombreRuta.includes('Despacho D') || nombreRuta.includes('DESPACHO D') || nombreRuta.includes('Despacho E')) {
        return 'C'; // Estos programados son equivalentes a Despacho C
      }

      // Mapear variaciones de nombres de despachos
      if (nombreRuta.includes('Despacho A') || nombreRuta.includes('DESPACHO A')) return 'A';
      if (nombreRuta.includes('Despacho B') || nombreRuta.includes('DESPACHO B')) return 'B';
      if (nombreRuta.includes('Despacho C') || nombreRuta.includes('DESPACHO C')) return 'C';

      console.log('❓ Programado no mapeado:', nombreRuta);
      return nombreRuta;
    }).filter(Boolean);

    const rutasHechasNombres = [...rutasHechasTurnos, ...rutasHechasProgramados];

    // Encontrar la última ruta A o B (para alternancia) considerando turnos y programados
    let ultimoEventoAB: { ruta: string; hora: Date; tipo: 'turno' | 'programado' } | null = null;

    // Obtener el último turno A o B que ya ocurrió
    const ultimoTurnoABObj = turnosHoy.find(t => {
      const nombreRuta = t.ruta?.nombre || '';
      return nombreRuta.includes('Despacho A') || nombreRuta.includes('Despacho B');
    });

    // Obtener el último programado A o B que ya ocurrió
    const ultimoProgramadoABObj = programadosHoy.find(p => {
      const nombreRuta = p.ruta?.nombre || '';
      return nombreRuta.includes('Despacho A') || nombreRuta.includes('Despacho B');
    });

    if (ultimoTurnoABObj && ultimoProgramadoABObj) {
      const horaTurno = new Date(ultimoTurnoABObj.horaSalida);
      const horaProgramado = this.convertirNumeroHoraADate(ultimoProgramadoABObj.hora, ultimoProgramadoABObj.fecha);

      if (horaTurno > horaProgramado) {
        ultimoEventoAB = {
          ruta: ultimoTurnoABObj.ruta?.nombre === 'Despacho A' ? 'A' : 'B',
          hora: horaTurno,
          tipo: 'turno'
        };
      } else {
        ultimoEventoAB = {
          ruta: ultimoProgramadoABObj.ruta?.nombre === 'Despacho A' ? 'A' : 'B',
          hora: horaProgramado,
          tipo: 'programado'
        };
      }
    } else if (ultimoTurnoABObj) {
      ultimoEventoAB = {
        ruta: ultimoTurnoABObj.ruta?.nombre || '',
        hora: new Date(ultimoTurnoABObj.horaSalida),
        tipo: 'turno'
      };
    } else if (ultimoProgramadoABObj) {
      ultimoEventoAB = {
        ruta: ultimoProgramadoABObj.ruta?.nombre === 'Despacho A' ? 'A' : 'B',
        hora: this.convertirNumeroHoraADate(ultimoProgramadoABObj.hora, ultimoProgramadoABObj.fecha),
        tipo: 'programado'
      };
    }

    const ultimaRutaAB = ultimoEventoAB ? ultimoEventoAB.ruta : null;

    // La última ruta de cualquier tipo (para logs)
    // No es necesario ya que estamos filtrando por hora
    // const ultimaRutaHecha = turnosHoy[0]?.ruta?.nombre;

    console.log('🔍 Rutas hechas hoy por móvil (turnos + programados):', {
      movilId,
      turnosHoy: turnosHoy.length,
      programadosHoy: programadosHoy.length,
      rutasHechasTurnos,
      rutasHechasProgramados,
      rutasHechasTotal: rutasHechasNombres,
      ultimoEventoAB: ultimoEventoAB ? { ruta: ultimoEventoAB.ruta, hora: ultimoEventoAB.hora.toISOString(), tipo: ultimoEventoAB.tipo } : null,
      ultimaRutaABFinal: ultimaRutaAB,
      debeAlternar: ultimaRutaAB === 'A' ? 'B' : ultimaRutaAB === 'B' ? 'A' : 'N/A'
    });

    // Filtrar huecos para la sugerencia automática
    const huecosParaSugerencia = huecos.filter(hueco => {
      // Mapear nombre del hueco a nombre corto para comparación
      const rutaHuecoCorta = hueco.rutaNombre.includes('Despacho A') ? 'A' :
        hueco.rutaNombre.includes('Despacho B') ? 'B' :
          hueco.rutaNombre.includes('Despacho C') || hueco.rutaNombre.includes('Despacho D') || hueco.rutaNombre.includes('Despacho E') ? 'C' :
            hueco.rutaNombre;

      console.log(`🔍 Evaluando hueco para sugerencia: ${hueco.rutaNombre}`, {
        rutaHuecoCorta,
        rutasHechasNombres,
        yaHizoC: rutasHechasNombres.includes('C'),
        esCDespacho: rutaHuecoCorta === 'C'
      });

      // Si ya hizo la ruta C, no permitir sugerirla nuevamente (solo se hace una vez)
      const yaHizoC = rutasHechasNombres.includes('C');
      if (rutaHuecoCorta === 'C' && yaHizoC) {
        // No es necesario verificar el origen (turno o programado), solo si ya hizo C
        console.log(`🚫 Hueco descartado para sugerencia automática: ${hueco.rutaNombre} (móvil ${movilId} ya hizo la ruta C hoy)`);
        return false;
      }

      // Para rutas A y B, permitir repetición pero respetar la alternancia
      if (rutaHuecoCorta === 'A' || rutaHuecoCorta === 'B') {
        return true;
      }

      // Para otras rutas, no mostrar si ya las hizo (excepto C, que ya se manejó)
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
    const huecosA = huecosParaSugerencia.filter(h => {
      return h.rutaNombre.includes('Despacho A');
    });
    const huecoMasTempranoA = huecosA.sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime())[0];

    const huecosB = huecosParaSugerencia.filter(h => {
      return h.rutaNombre.includes('Despacho B');
    });
    const huecoMasTempranoB = huecosB.sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime())[0];

    const huecosC = huecosParaSugerencia.filter(h => {
      return h.rutaNombre.includes('Despacho C') || h.rutaNombre.includes('Despacho D') || h.rutaNombre.includes('Despacho E');
    });
    const huecoMasTempranoC = huecosC.sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime())[0];

    // Determinar si ya hizo C basándose en rutasHechasNombres
    const yaHizoCGeneral = rutasHechasNombres.includes('C');

    console.log('🔍 Huecos filtrados por tipo:', {
      huecosA: huecosA.length,
      huecosB: huecosB.length,
      huecosC: huecosC.length,
      rutasHechasNombres,
      incluyeC: yaHizoCGeneral
    });

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
      if (huecoMasTempranoC && !yaHizoCGeneral) huecosDisponibles.push(huecoMasTempranoC); // Usar yaHizoCGeneral

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

    // PASO 3: Si hay sugerencia de alternancia, buscar el mejor hueco de esa ruta con prioridad ROTACION
    let mejorHueco = sugerenciaPorAlternancia;

    if (sugerenciaPorAlternancia) {
      // Buscar el mejor hueco de la ruta sugerida por alternancia que tenga prioridad ROTACION
      const huecosDeRutaSugerida = huecosParaSugerencia.filter(h => {
        const rutaCorta = h.rutaNombre.includes('Despacho A') ? 'A' :
          h.rutaNombre.includes('Despacho B') ? 'B' :
            h.rutaNombre.includes('Despacho C') || h.rutaNombre.includes('Despacho D') || h.rutaNombre.includes('Despacho E') ? 'C' : h.rutaNombre;
        const rutaSugeridaCorta = sugerenciaPorAlternancia.rutaNombre.includes('Despacho A') ? 'A' :
          sugerenciaPorAlternancia.rutaNombre.includes('Despacho B') ? 'B' :
            sugerenciaPorAlternancia.rutaNombre.includes('Despacho C') || sugerenciaPorAlternancia.rutaNombre.includes('Despacho D') || sugerenciaPorAlternancia.rutaNombre.includes('Despacho E') ? 'C' : sugerenciaPorAlternancia.rutaNombre;
        return rutaCorta === rutaSugeridaCorta && h.prioridad === 'ROTACION';
      });

      if (huecosDeRutaSugerida.length > 0) {
        // Ordenar por tiempo y tomar el más temprano
        mejorHueco = huecosDeRutaSugerida.sort((a, b) =>
          new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime()
        )[0];
        console.log(`🔄 Alternancia: seleccionando ${mejorHueco.rutaNombre} ${mejorHueco.horaSalida} con prioridad ROTACION`);
      } else {
        console.log(`⚠️ No hay huecos de ${sugerenciaPorAlternancia.rutaNombre} con prioridad ROTACION, usando sugerencia original`);
      }
    }

    // PASO 4: Verificar si hay una ruta C mejor (solo si C no se ha hecho y hay alternancia válida)
    if (ultimaRutaAB && huecoMasTempranoC && !yaHizoCGeneral && mejorHueco) { // Usar yaHizoCGeneral
      const horaC = new Date(huecoMasTempranoC.horaSalida).getTime();
      const horaMejorHueco = new Date(mejorHueco.horaSalida).getTime();

      if (horaC < horaMejorHueco) {
        mejorHueco = huecoMasTempranoC;
        console.log(`🔄 C mejor que alternancia: C ${huecoMasTempranoC.horaSalida} está antes que ${mejorHueco.rutaNombre} ${mejorHueco.horaSalida}`);
      } else {
        console.log(`🔄 Alternancia mejor que C: ${mejorHueco.rutaNombre} ${mejorHueco.horaSalida} está antes que C ${huecoMasTempranoC.horaSalida}`);
      }
    } else if (huecoMasTempranoC && !yaHizoCGeneral && !mejorHueco) { // Usar yaHizoCGeneral
      // Si no hay sugerencia de alternancia, usar C
      mejorHueco = huecoMasTempranoC;
      console.log(`🔄 No hay alternancia disponible, usando C ${huecoMasTempranoC.horaSalida}`);
    } else if (yaHizoCGeneral) { // Usar yaHizoCGeneral
      console.log(`🔄 C ya hecha, manteniendo sugerencia de alternancia`);
      // Si C ya se hizo, asegurar que no se seleccione C como mejor hueco
      if (mejorHueco && (mejorHueco.rutaNombre.includes('Despacho C') || mejorHueco.rutaNombre.includes('Despacho D') || mejorHueco.rutaNombre.includes('Despacho E'))) {
        console.log(`⚠️ C ya hecha pero mejorHueco es C, buscando alternativa...`);
        // Buscar el siguiente mejor hueco que no sea C
        const huecosSinC = huecosParaSugerencia.filter(h =>
          !(h.rutaNombre.includes('Despacho C') || h.rutaNombre.includes('Despacho D') || h.rutaNombre.includes('Despacho E'))
        );
        if (huecosSinC.length > 0) {
          const mejorHuecoSinC = huecosSinC.sort((a, b) => {
            const prioridadA = this.getPrioridadNumerica(a.prioridad);
            const prioridadB = this.getPrioridadNumerica(b.prioridad);
            if (prioridadA !== prioridadB) {
              return prioridadA - prioridadB;
            }
            return new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime();
          })[0];
          mejorHueco = mejorHuecoSinC;
          console.log(`🔄 C ya hecha, cambiando a: ${mejorHueco.rutaNombre} ${mejorHueco.horaSalida}`);
        }
      }
    }

    // PASO 5: Si no hay sugerencia, usar el hueco más temprano con mejor prioridad
    if (!mejorHueco) {
      const huecosOrdenadosPorPrioridadYTiempo = huecosParaSugerencia.sort((a, b) => {
        const prioridadA = this.getPrioridadNumerica(a.prioridad);
        const prioridadB = this.getPrioridadNumerica(b.prioridad);

        // Ordenar por prioridad primero, luego por tiempo
        if (prioridadA !== prioridadB) {
          return prioridadA - prioridadB;
        }
        return new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime();
      });
      mejorHueco = huecosOrdenadosPorPrioridadYTiempo[0];
      console.log(`🔄 No hay sugerencia específica, usando el mejor por prioridad y tiempo: ${mejorHueco.rutaNombre} ${mejorHueco.horaSalida} (${mejorHueco.prioridad})`);
    }

    // PASO 6: Generar alternativas (excluyendo el mejor hueco)
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
    const valorConfig = this.configuracion?.valor;
    const tiempoMinimoSalida = valorConfig ? parseInt(valorConfig) : 2;
    const tiempoFinal = isNaN(tiempoMinimoSalida) ? 2 : tiempoMinimoSalida;
    const tiempoHastaSalida = (horaSalidaDate.getTime() - ahora.getTime()) / (1000 * 60);
    console.log('⏱️ Tiempo mínimo de salida:', tiempoFinal, 'minutos');
    console.log('⏱️ Tiempo hasta salida:', tiempoHastaSalida, 'minutos');

    // Agregar un margen de tolerancia de 1 minuto para compensar el tiempo de procesamiento
    const margenTolerancia = 1; // 1 minuto
    if (tiempoHastaSalida < (tiempoFinal - margenTolerancia)) {
      console.error('❌ Error: No respeta tiempo mínimo de salida');
      const tiempoFaltante = tiempoFinal - tiempoHastaSalida;

      // Regenerar huecos basados en la hora actual
      console.log('🔄 Regenerando huecos porque el turno no cumple tiempo mínimo...');
      await this.limpiarHuecosAntiguos(ahora);
      await this.generarNuevosHuecos(ahora, movilId, conductorId);

      // En lugar de fallar, lanzar un error especial que indique que se regeneraron huecos
      throw new Error(`TIEMPO_INSUFICIENTE_HUECOS_REGENERADOS: El turno debe programarse al menos ${tiempoFinal} minutos después de la hora actual. Faltan ${Math.round(tiempoFaltante)} minutos. Se han regenerado los huecos basados en la hora actual.`);
    }
    console.log('✅ Validación de tiempo mínimo: OK');

    // Verificar que móvil y conductor estén disponibles
    console.log('🚗 Buscando móvil y conductor en la base de datos...');

    try {
      const [movil, conductor] = await Promise.all([
        prisma.automovil.findUnique({ 
          where: { id: movilId },
          select: { id: true, movil: true, activo: true, enRevision: true }
        }),
        prisma.conductor.findUnique({ where: { id: conductorId } })
      ]);

      console.log('📋 Resultados de búsqueda:', {
        movil: movil ? { id: movil.id, movil: movil.movil, activo: movil.activo, enRevision: movil.enRevision } : null,
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

      // Validar que el automóvil no esté en revisión
      if (movil.enRevision) {
        console.error('❌ Error: Móvil está en revisión técnica');
        throw new Error(`El móvil ${movil.movil} está actualmente en revisión técnica y no puede ser despachado`);
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
        estado: 'COMPLETADO'
      });

      const turno = await prisma.turno.create({
        data: {
          movilId,
          conductorId,
          rutaId,
          fecha: ahora,
          horaSalida: horaSalidaDate,
          horaCreacion: ahora,
          estado: 'COMPLETADO',
          usuarioId: usuarioId || null
        },
        include: {
          ruta: true,
          automovil: true,
          conductor: true,
          usuario: true
        }
      });

      console.log('✅ Turno creado exitosamente:', {
        id: turno.id,
        ruta: turno.ruta?.nombre,
        movil: turno.automovil?.movil,
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
        movil: { id: turno.automovil.id, movil: turno.automovil.movil },
        conductor: { id: turno.conductor.id, nombre: turno.conductor.nombre },
        estado: turno.estado || 'NO_COMPLETADO'
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
        automovil: true,
        conductor: true
      },
      orderBy: { horaSalida: 'asc' }
    });

    return turnos.map(turno => ({
      id: turno.id,
      horaSalida: turno.horaSalida.toISOString(),
      ruta: turno.ruta ? { id: turno.ruta.id, nombre: turno.ruta.nombre } : null,
      movil: { id: turno.automovil.id, movil: turno.automovil.movil },
      conductor: { id: turno.conductor.id, nombre: turno.conductor.nombre },
      estado: turno.estado || 'NO_COMPLETADO'
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
        estado: { in: ['COMPLETADO', 'NO_COMPLETADO'] }
      },
      include: {
        ruta: true,
        automovil: true,
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
        movil: t.automovil.movil,
        estado: t.estado
      }))
    });

    return turnos.map(turno => ({
      id: turno.id,
      horaSalida: turno.horaSalida.toISOString(),
      ruta: turno.ruta ? { id: turno.ruta.id, nombre: turno.ruta.nombre } : null,
      movil: { id: turno.automovil.id, movil: turno.automovil.movil },
      conductor: { id: turno.conductor.id, nombre: turno.conductor.nombre },
      estado: turno.estado || 'NO_COMPLETADO'
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

    // Obtener la hora actual de Bogotá para filtrar eventos futuros
    const ahoraBogotaDate = this.getHoraBogota(ahora).date;

    // Fecha actual
    const now = new Date();

    // Inicio del día (00:00 UTC)
    const inicioDiaActual = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));

    // Fin del día (inicio del día siguiente 00:00 UTC)
    const finDiaActual = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1
    ));

    console.log('📅 Filtro de fecha en obtenerRutasMovilHoy:', {
      inicioDiaActual: inicioDiaActual.toISOString(),
      finDiaActual: finDiaActual.toISOString(),
      fechaHoy: fechaHoy
    });

    // Obtener turnos del móvil
    const todosTurnos = await prisma.turno.findMany({
      where: {
        movilId,
        horaSalida: {
          gte: inicioDiaActual,
          lt: finDiaActual
        },
        // horaSalida: { lte: ahoraBogotaDate }, // Se elimina este filtro para mostrar todas las rutas del día
        estado: { in: ['COMPLETADO', 'NO_COMPLETADO'] }
      },
      include: {
        ruta: true,
        automovil: true,
        conductor: true
      },
      orderBy: { horaSalida: 'asc' }
    });

    // Los turnos ya están filtrados por fecha y hora
    const turnosHoy = todosTurnos;
    console.log("****************************\n******************************\n*******")
    console.log(inicioDiaActual)
    console.log(finDiaActual)
    // Obtener programados del móvil
    const todosProgramados = await prisma.programacion.findMany({

      where: {
        automovilId: movilId, // movilId es realmente el automovilId
        fecha: {
          gte: inicioDiaActual,
          lt: finDiaActual
        },
        // hora: { lte: this.convertirDateANumeroHora(ahoraBogotaDate) } // Removido para mostrar todos los programados del día
      },
      include: {
        automovil: true,
        ruta: true,
        realizadoPorConductor: true, // Incluir información del conductor que realizó el recibo
        realizadoPor: true // Incluir información del móvil que realizó el recibo
      },
      orderBy: { hora: 'asc' }
    });

    // Los programados ya están filtrados por fecha y hora
    const programadosHoy = todosProgramados;

    console.log('📋 Rutas encontradas para el móvil:', {
      movilId,
      totalTurnos: turnosHoy.length,
      totalProgramados: programadosHoy.length,
      fechaHoy
    });

    function toFixedISOString(date: Date): string {
      const pad = (num: number, size: number = 2) => String(num).padStart(size, "0");

      return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate()) +
        "T" +
        pad(date.getHours()) +
        ":" +
        pad(date.getMinutes()) +
        ":" +
        pad(date.getSeconds()) +
        "." +
        pad(date.getMilliseconds(), 3) +
        "Z"
      );
    }

    // Combinar turnos y programados
    const eventosCombinados: Turno[] = [
      ...todosTurnos.map(t => ({ // Mapear a la interfaz Turno
        id: t.id,
        horaSalida: t.horaSalida.toISOString(),
        ruta: t.ruta ? { id: t.ruta.id, nombre: t.ruta.nombre } : null,
        movil: { id: t.automovil.id, movil: t.automovil.movil },
        conductor: { id: t.conductor.id, nombre: t.conductor.nombre },
        tipo: 'turno',
        estado: t.estado || 'NO_COMPLETADO'
      })),
      ...todosProgramados.map(p => {

        console.log(p.hora)
        console.log(typeof (p.hora))

        const horaString = p.hora.toString();
        // Aseguramos que el string tenga al menos 4 dígitos con ceros a la izquierda
        const normalized = horaString.padStart(4, "0");

        const hours = normalized.slice(0, -2); // primeros 2 dígitos
        const minutes = normalized.slice(-2);  // últimos 2 dígitos

        const fechaAsignacion = new Date(); // Crear nueva fecha para la hora de salida
        fechaAsignacion.setHours(Number(hours), Number(minutes), 0, 0);

        // Determinar el estado basado en si tiene realizadoPorId (móvil que realizó)
        const estado = p.realizadoPorId 
          ? 'COMPLETADO'
          : 'NO_COMPLETADO';

        return {
          id: p.id,
          // Usar el mismo formato ISO que los turnos regulares
          horaSalida: toFixedISOString(fechaAsignacion),
          ruta: p.ruta ? { id: p.ruta.id, nombre: p.ruta.nombre } : null,
          movil: p.automovil ? { id: p.automovil.id, movil: p.automovil.movil } : { id: 0, movil: 'N/A' }, // Asume que un programado tiene un movil asignado
          conductor: { id: 0, nombre: 'Programado' }, // Asigna un conductor por defecto para programados
          tipo: 'programado',
          estado: estado
        };
      })
    ];

    // Ordenar todos los eventos por horaSalida
    eventosCombinados.sort((a, b) => {
      const horaA = typeof a.horaSalida === 'string' ? new Date(a.horaSalida) : this.convertirNumeroHoraADate(a.horaSalida as number, ahora);
      const horaB = typeof b.horaSalida === 'string' ? new Date(b.horaSalida) : this.convertirNumeroHoraADate(b.horaSalida as number, ahora);
      return horaA.getTime() - horaB.getTime();
    });

    return eventosCombinados;
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
        automovil: true,
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
      movil: turno.automovil.movil,
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

    // Obtener la hora actual de Bogotá para filtrar eventos futuros
    const ahoraBogotaDate = this.getHoraBogota(ahora).date;

    // Obtener todos los programados disponibles del día actual
    // Crear fechas para el inicio y fin del día actual
    const inicioDiaActual = new Date(ahoraBogotaDate.getFullYear(), ahoraBogotaDate.getMonth(), ahoraBogotaDate.getDate());
    const finDiaActual = new Date(ahoraBogotaDate.getFullYear(), ahoraBogotaDate.getMonth(), ahoraBogotaDate.getDate() + 1);

    console.log('📅 Filtro de fecha:', {
      inicioDiaActual: inicioDiaActual.toISOString(),
      finDiaActual: finDiaActual.toISOString(),
      fechaHoy: fechaHoy
    });

    const todosProgramados = await prisma.programacion.findMany({
      where: {
        fecha: {
          gte: inicioDiaActual,
          lt: finDiaActual
        },
        hora: { lte: this.convertirDateANumeroHora(ahoraBogotaDate) } // Solo programados que ya ocurrieron o están ocurriendo
      },
      include: {
        ruta: true
      },
      orderBy: { hora: 'asc' }
    });

    console.log('🔍 Programados disponibles en BD:', {
      total: todosProgramados.length,
      programados: todosProgramados.map(p => ({
        id: p.id,
        ruta: p.ruta?.nombre || 'Sin ruta',
        fecha: new Date(p.fecha).toISOString().split('T')[0],
        hora: p.hora,
        automovilId: p.automovilId
      }))
    });

    // Filtrar programados de hoy (ya filtrados en la consulta)
    const programados = todosProgramados;

    console.log('📋 Programados encontrados:', programados.length);

    // Convertir programados a huecos, filtrando por hora
    const huecosProgramados: HuecoDisponible[] = [];

    for (const programado of programados) {
      try {
        // Convertir la hora del programado (número) a Date usando la fecha del programado
        let horaProgramado: Date;

        if (typeof programado.hora === 'number') {
          // La hora se guarda como número (ej: 450 = 04:50)
          const horas = Math.floor(programado.hora / 100);
          const minutos = programado.hora % 100;

          const fechaProgramado = new Date(programado.fecha);
          horaProgramado = new Date(fechaProgramado);
          horaProgramado.setHours(horas, minutos, 0, 0);
        } else {
          // Fallback por si viene en otro formato
          const fechaProgramado = new Date(programado.fecha);
          horaProgramado = new Date(fechaProgramado);
          horaProgramado.setHours(7, 0, 0, 0); // Hora por defecto
        }

        // Solo incluir si está en el futuro (después de ahoraBogotaDate)
        const minutosHastaProgramado = Math.round((horaProgramado.getTime() - ahoraBogotaDate.getTime()) / (1000 * 60));

        // Verificar consistencia: como automovilId no puede ser null, 
        // consideramos disponibles aquellos con automovilId = 0 (valor especial para "disponible")
        const esRealmenteDisponible = programado.automovilId === 0;

        console.log(`🔍 Evaluando programado: ${programado.ruta?.nombre || 'Sin ruta'}`, {
          id: programado.id,
          horaProgramado: horaProgramado.toISOString(),
          ahora: ahoraBogotaDate.toISOString(),
          minutosHastaProgramado,
          estaEnFuturo: horaProgramado > ahoraBogotaDate,
          esDisponible: programado.automovilId === 0,
          automovilId: programado.automovilId,
          esRealmenteDisponible
        });

        if (esRealmenteDisponible && horaProgramado > ahoraBogotaDate) {
          const huecoGenerado = {
            rutaId: 0, // Los programados no tienen rutaId en la tabla Ruta
            rutaNombre: programado.ruta?.nombre || 'Sin ruta',
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
            if (programado.automovilId !== 0) {
              razon = 'Ya asignado (tiene movilId)';
            }
          } else if (horaProgramado <= ahoraBogotaDate) {
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
    const { date: ahoraBogotaDate } = this.getHoraBogota(ahora);
    const fechaHoy = ahoraBogotaDate.toISOString().split('T')[0];

    // Obtener todos los programados y filtrar por fecha
    const todosProgramados = await prisma.programacion.findMany({
      select: { fecha: true, hora: true }
    });

    const programadosHoy = todosProgramados.filter(prog => {
      const fechaProgramado = new Date(prog.fecha).toISOString().split('T')[0];
      return fechaProgramado === fechaHoy; // && this.convertirNumeroHoraADate(prog.hora, prog.fecha) <= ahoraBogotaDate;
    });

    console.log('📊 Verificación de programados hoy:', {
      fechaHoy,
      totalProgramados: todosProgramados.length,
      programadosHoy: programadosHoy.length,
      hayProgramados: programadosHoy.length > 0
    });

    return programadosHoy.length > 0;
  }

  // Función auxiliar para obtener la hora actual en Bogotá (con simulación)
  private getHoraBogota(date: Date): { hours: number; minutes: number; date: Date } {
    const formatter = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const seconds = parseInt(parts.find(p => p.type === 'second')?.value || '0');

    // Reconstruir la fecha en la zona horaria de Bogotá
    const bogotaDate = new Date(year, month - 1, day, hours, minutes, seconds);

    return { hours, minutes, date: bogotaDate };
  }

  // Función auxiliar para convertir número de hora (HHMM) y fecha a un objeto Date en Bogotá
  private convertirNumeroHoraADate(numeroHora: number, fechaBase: Date): Date {
    const horas = Math.floor(numeroHora / 100);
    const minutos = numeroHora % 100;

    const fecha = new Date(fechaBase);
    fecha.setHours(horas, minutos, 0, 0);

    const { date: bogotaDate } = this.getHoraBogota(fecha);
    return bogotaDate;
  }

  // Función auxiliar para convertir Date a número de hora (HHMM) en Bogotá
  private convertirDateANumeroHora(date: Date): number {
    const { hours, minutes } = this.getHoraBogota(date);
    return hours * 100 + minutes;
  }
}