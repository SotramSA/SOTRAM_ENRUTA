import prismaWithRetry from '@/lib/prismaClient'
import { NextRequest, NextResponse } from 'next/server'

// Plantilla FIJA de asignaciones (basada EXACTAMENTE en el Excel - NUNCA cambiar)
// Cada "posición" representa un conjunto fijo de turnos que debe hacer un móvil
const PLANTILLA_FIJA: Record<string, Array<{ruta: string, hora: string}>> = {
  // DESPACHO D1 + DESPACHO A (dobles)
  'A1': [
    { ruta: 'DESPACHO D. RUT7 CORZO LORETO', hora: '04:50' },
    { ruta: 'Despacho A', hora: '06:00' }
  ],
  'A47' : [
    { ruta: 'Despacho A', hora: '04:50' }
  ],
  'A4': [
    { ruta: 'DESPACHO D. RUT7 CORZO LORETO', hora: '04:57' },
    { ruta: 'Despacho A', hora: '06:10' }
  ],
  'A7': [
    { ruta: 'DESPACHO D. RUT7 CORZO LORETO', hora: '05:04' },
    { ruta: 'Despacho B', hora: '06:15' }
  ],
  'A10': [
    { ruta: 'DESPACHO D. RUT7 CORZO LORETO', hora: '05:11' },
    { ruta: 'Despacho A', hora: '06:30' }
  ],
  
  // DESPACHO D2 + DESPACHO A (dobles)
  'A2': [
    { ruta: 'DESPACHO D RUT4 PAMPA-CORZO', hora: '04:50' },
    { ruta: 'Despacho B', hora: '05:57' }
  ],
  'A5': [
    { ruta: 'DESPACHO D RUT4 PAMPA-CORZO', hora: '05:00' },
    { ruta: 'Despacho B', hora: '06:05' }
  ],
  'A8': [
    { ruta: 'DESPACHO D RUT4 PAMPA-CORZO', hora: '05:10' },
    { ruta: 'Despacho C', hora: '06:30' }
  ],
  
  // DESPACHO E + DESPACHO B/C (dobles)
  'A3': [
    { ruta: 'DESPACHO E RUT7 CORZO', hora: '04:55' },
    { ruta: 'Despacho C', hora: '06:10' }
  ],
  'A6': [
    { ruta: 'DESPACHO E RUT7 CORZO', hora: '05:05' },
    { ruta: 'Despacho A', hora: '06:20' }
  ],
  'A9': [
    { ruta: 'DESPACHO E RUT7 CORZO', hora: '05:15' },
    { ruta: 'Despacho B', hora: '06:25' }
  ],
  
  // DESPACHO A solo matutino
  'A14': [{ ruta: 'Despacho A', hora: '05:00' }],
  'A17': [{ ruta: 'Despacho A', hora: '05:10' }],
  'A20': [{ ruta: 'Despacho A', hora: '05:20' }],
  'A23': [{ ruta: 'Despacho A', hora: '05:28' }],
  'A26': [{ ruta: 'Despacho A', hora: '05:36' }],
  'A29': [{ ruta: 'Despacho A', hora: '05:44' }],
  'A32': [
    { ruta: 'Despacho A', hora: '05:52' },
    { ruta: 'Despacho Puente piedra', hora: '17:00' }
  ],
  
  // DESPACHO B (algunos solo matutino, otros dobles)
  'A15': [{ ruta: 'Despacho B', hora: '04:55' }],
  'A18': [{ ruta: 'Despacho B', hora: '05:05' }],
  'A33': [
    { ruta: 'Despacho B', hora: '05:49' },
    { ruta: 'Despacho Puente piedra', hora: '17:30' }
  ],
  
  // DESPACHO C (algunos solo matutino, otros dobles)
  'A16': [{ ruta: 'Despacho C', hora: '05:00' }],
  'A19': [{ ruta: 'Despacho C', hora: '05:10' }],
  'A34': [
    { ruta: 'Despacho C', hora: '06:00' },
    { ruta: 'Despacho Puente piedra', hora: '18:00' }
  ],
  'A36': [{ ruta: 'Despacho B', hora: '06:45' },{ ruta: 'Despacho C', hora: '19:20' }],
  
  // Completar las posiciones restantes (combinando matutino + vespertino en las MISMAS posiciones)
  'A21': [
    { ruta: 'Despacho B', hora: '05:15' },
    { ruta: 'Despacho A', hora: '17:00' }
  ],
  'A22': [
    { ruta: 'Despacho C', hora: '05:20' },
    { ruta: 'Despacho A', hora: '17:12' }
  ],
  'A24': [
    { ruta: 'Despacho B', hora: '05:25' },
    { ruta: 'Despacho A', hora: '17:24' }
  ],
  'A25': [
    { ruta: 'Despacho C', hora: '05:30' },
    { ruta: 'Despacho A', hora: '17:36' }
  ],
  'A27': [
    { ruta: 'Despacho B', hora: '05:33' },
    { ruta: 'Despacho A', hora: '17:48' }
  ],
  'A28': [
    { ruta: 'Despacho C', hora: '05:40' },
    { ruta: 'Despacho A', hora: '18:00' }
  ],
  'A30': [
    { ruta: 'Despacho B', hora: '05:41' },
    { ruta: 'Despacho A', hora: '18:12' }
  ],
  'A31': [
    { ruta: 'Despacho C', hora: '05:50' },
    { ruta: 'Despacho A', hora: '18:24' }
  ],
  'A11': [
    { ruta: 'Despacho Puente piedra', hora: '05:51' },
    { ruta: 'Despacho A', hora: '18:36' }
  ],
  'A12': [
    { ruta: 'Despacho Puente piedra', hora: '06:27' },
    { ruta: 'Despacho A', hora: '18:48' }
  ],
  'A13': [
    { ruta: 'Despacho Puente piedra', hora: '06:45' },
    { ruta: 'Despacho A', hora: '19:00' }
  ],
  'A46': [{ ruta: 'Despacho A', hora: '19:12' }],
  'A35': [
    { ruta: 'Despacho B', hora: '06:35' },
    { ruta: 'Despacho A', hora: '19:24' }
  ],
  'A38': [
    { ruta: 'Despacho C', hora: '06:50' },
    { ruta: 'Despacho A', hora: '19:36' }
  ],
  'A39': [
    { ruta: 'Despacho C', hora: '07:10' },
    { ruta: 'Despacho A', hora: '19:48' }
  ],
  'A40': [
    { ruta: 'Despacho C', hora: '07:30' },
    { ruta: 'Despacho A', hora: '20:00' }
  ],
  'A41': [
    { ruta: 'Despacho C', hora: '07:50' },
    { ruta: 'Despacho A', hora: '20:12' }
  ],
  'A42': [
    { ruta: 'Despacho C', hora: '08:10' },
    { ruta: 'Despacho A', hora: '20:24' }
  ],
  
  // Posiciones finales para completar las 46
  'A43': [
    { ruta: 'Despacho A', hora: '06:40' },
    { ruta: 'Despacho C', hora: '19:00' }
  ],
  'A44': [
    { ruta: 'Despacho A', hora: '06:50' },
    { ruta: 'Despacho C', hora: '19:40' }
  ],
  'A45': [
    { ruta: 'Despacho A', hora: '07:00' },
    { ruta: 'Despacho C', hora: '20:20' }
  ],
  'A37': [
    { ruta: 'Despacho B', hora: '06:55' },
    { ruta: 'Despacho C', hora: '20:00' }
  ]
}

// Función para convertir string de hora a Date
function horaStringToDate(horaString: string, fecha: Date): Date {
  const [horas, minutos] = horaString.split(':').map(Number)
  const fechaHora = new Date(fecha)
  fechaHora.setHours(horas, minutos, 0, 0)
  return fechaHora
}

// Función para obtener el grupo de despacho (para validaciones de rotación)
function getDespachoGroup(ruta: string): string {
  // Grupos de despachos relacionados (para rotación inteligente)
  const gruposDespacho: Record<string, string> = {
    'DESPACHO D. RUT7 CORZO LORETO': 'Grupo Corzo',
    'DESPACHO D RUT4 PAMPA-CORZO': 'Grupo Pampa', 
    'DESPACHO E RUT7 CORZO': 'Grupo Corzo E',
    'Despacho Puente piedra': 'Grupo Puente',
    'Despacho A': 'Grupo Principal A',
    'Despacho B': 'Grupo Principal B',
    'Despacho C': 'Grupo Principal C'
  }
  
  return gruposDespacho[ruta] || ruta
}

// Función para calcular puntuación de un móvil para una ruta específica
function calcularPuntuacion(
  automovilId: number,
  ruta: string,
  historial: any[],
  fechaActual: Date,
  movilesSinTrabajarAyer: Set<number>
): number {
  let puntuacion = 0
  
  // Obtener historial de los últimos 2 días
  const fechaLimite = new Date(fechaActual)
  fechaLimite.setDate(fechaLimite.getDate() - 2)
  
  const historialReciente = historial.filter(h => 
    h.automovilId === automovilId && 
    new Date(h.fecha) >= fechaLimite
  )
  
  // Verificar si el móvil no trabajó ayer (prioridad alta)
  if (movilesSinTrabajarAyer.has(automovilId)) {
    puntuacion += 1000 // Prioridad muy alta
  }
  
  // Verificar si el móvil ya hizo esta ruta en los últimos 2 días
  const grupoRuta = getDespachoGroup(ruta)
  const rutasRecientes = historialReciente.map(h => getDespachoGroup(h.ruta?.nombre || ''))
  
  if (rutasRecientes.includes(grupoRuta)) {
    puntuacion -= 200 // Penalización alta por repetición (antes 500)
  }
  
  // Penalizar por muchas rutas recientes (evitar sobrecarga)
  const rutasUltimos2Dias = historialReciente.length
  puntuacion -= rutasUltimos2Dias * 5 // (antes 10)
  
  // Bonus por variedad de rutas
  const rutasUnicas = new Set(rutasRecientes).size
  puntuacion += rutasUnicas * 50
  
  // Bonus aleatorio para evitar patrones predecibles
  puntuacion += Math.random() * 10
  
  // LOGGING DETALLADO para diagnosticar el sistema de puntos
  if (Math.random() < 0.1) { // Solo 10% de las veces para no llenar logs
    console.log(`🎯 Puntuación detallada para móvil ${automovilId} en ruta ${ruta}:`, {
      base: 0,
      noTrabajoAyer: movilesSinTrabajarAyer.has(automovilId) ? 1000 : 0,
      penalizacionRutaReciente: rutasRecientes.includes(grupoRuta) ? -200 : 0,
      penalizacionRutasUltimos2Dias: -(rutasUltimos2Dias * 5),
      bonusVariedad: rutasUnicas * 50,
      bonusAleatorio: Math.random() * 10,
      total: puntuacion,
      historialReciente: historialReciente.length,
      rutasRecientes: rutasRecientes,
      grupoRuta: grupoRuta
    })
  }
  
  return puntuacion
}

export async function POST(request: NextRequest) {
  try {
    const { fecha, manual = false } = await request.json()

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    }

    const fechaObj = new Date(fecha)
    

          const result = await prismaWithRetry.executeWithRetry(async () => {
        // Obtener todas las rutas activas existentes
        let rutasDB = await prismaWithRetry.ruta.findMany({
          where: {
            activo: true
          },
          select: {
            id: true,
            nombre: true
          }
        })

        // Crear un mapa de nombres de ruta a IDs
        let rutaMap = new Map(rutasDB.map(ruta => [ruta.nombre, ruta.id]))

        // Obtener todas las rutas únicas de la plantilla fija
        const rutasEnPlantilla = new Set<string>()
        Object.values(PLANTILLA_FIJA).forEach(turnos => {
          turnos.forEach(turno => rutasEnPlantilla.add(turno.ruta))
        })

        // Asegurarse de que todas las rutas de la plantilla existan en la base de datos
        for (const rutaNombre of rutasEnPlantilla) {
          if (!rutaMap.has(rutaNombre)) {
            
            const nuevaRuta = await prismaWithRetry.ruta.create({
              data: {
                nombre: rutaNombre,
                activo: true,
                frecuenciaMin: 5,   // Valor por defecto
                frecuenciaMax: 60,  // Valor por defecto
                frecuenciaDefault: 10, // Valor por defecto
                frecuenciaActual: 10, // Valor por defecto
                unaVezDia: false    // Valor por defecto
              }
            })
            rutaMap.set(nuevaRuta.nombre, nuevaRuta.id)
            rutasDB.push(nuevaRuta) // Actualizar la lista local de rutas
          }
        }

        // Después de asegurar que todas las rutas existen, volver a obtener el mapa
        // Esto es redundante si siempre se crean, pero seguro si se hacen en pasos separados
        rutaMap = new Map(rutasDB.map(ruta => [ruta.nombre, ruta.id]))

        // Obtener todos los móviles activos y disponibles
        const movilesDisponibles = await prismaWithRetry.automovil.findMany({
          where: {
            activo: true,
            disponible: true,
            OR: [
              { colectivo: false },
              { colectivo: null }
            ]
          },
          include: {
            automovilPropietario: {
              where: { activo: true },
              include: {
                propietario: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            }
          },
          orderBy: {
            movil: 'asc'
          }
        })

      const movilesFiltrados = movilesDisponibles.map(movil => ({
        id: movil.id,
        movil: movil.movil,
        placa: movil.placa
      }))

      

      if (movilesFiltrados.length === 0) {
        throw new Error('No hay móviles disponibles para programación')
      }

      // Obtener historial de programación de los últimos 7 días
      const fechaInicio = new Date(fechaObj)
      fechaInicio.setDate(fechaInicio.getDate() - 7)
      
      const historial = await prismaWithRetry.programacion.findMany({
        where: {
          fecha: {
            gte: fechaInicio,
            lt: fechaObj
          }
        },
        include: {
          ruta: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      })

      // Identificar móviles que no trabajaron ayer
      const fechaAyer = new Date(fechaObj)
      fechaAyer.setDate(fechaAyer.getDate() - 1)
      
      const programacionesAyer = historial.filter(h => {
        const fechaHistorial = new Date(h.fecha)
        return fechaHistorial.toDateString() === fechaAyer.toDateString()
      })
      
      const movilesQueTrabajaronAyer = new Set(programacionesAyer.map(p => p.automovilId))
      const movilesSinTrabajarAyer = new Set(
        movilesFiltrados
          .filter(m => !movilesQueTrabajaronAyer.has(m.id))
          .map(m => m.id)
      )

      // Obtener lista de posiciones fijas (46 posiciones)
      const posicionesFijas = Object.keys(PLANTILLA_FIJA)
      const totalPosiciones = posicionesFijas.length

      

      // Eliminar programación existente para esta fecha
      await prismaWithRetry.programacion.deleteMany({
        where: {
          fecha: fechaObj
        }
      })

      // 🎲 Sistema equitativo con memoria de 2 días
      const asignacionesPorMovil = new Map()
      
      

      // 📋 Función para obtener las últimas 2 posiciones de un móvil
      async function obtenerUltimasPosiciones(movilId: number, dias: number = 2) {
        try {
          const fechaInicio = new Date(fechaObj)
          fechaInicio.setDate(fechaInicio.getDate() - dias)
          
          const programacionesAnteriores = await prismaWithRetry.programacion.findMany({
            where: {
              automovilId: movilId,
              fecha: {
                gte: fechaInicio,
                lt: fechaObj
              }
            },
            include: {
              ruta: true
            },
            orderBy: {
              fecha: 'desc'
            }
          })
          
          // Si no hay programaciones anteriores, devolver array vacío
          if (!programacionesAnteriores || programacionesAnteriores.length === 0) {
            
            return []
          }
        
        // Agrupar por fecha para encontrar qué posición hizo cada día
        const posicionesPorDia = new Map<string, string[]>()
        
        for (const prog of programacionesAnteriores) {
          const fechaKey = prog.fecha.toISOString().split('T')[0]
          if (!posicionesPorDia.has(fechaKey)) {
            posicionesPorDia.set(fechaKey, [])
          }
          
          // Buscar qué posición de la plantilla corresponde a esta programación
          for (const [posicion, turnos] of Object.entries(PLANTILLA_FIJA)) {
            const coincide = turnos.some(turno => {
              const rutaCoincide = turno.ruta === prog.ruta?.nombre
              const [horas, minutos] = turno.hora.split(':').map(Number)
              const horaNumerico = horas * 100 + minutos
              const horaCoincide = horaNumerico === prog.hora
              return rutaCoincide && horaCoincide
            })
            
            if (coincide) {
              posicionesPorDia.get(fechaKey)?.push(posicion)
              break
            }
          }
        }
        
        // Obtener posiciones únicas de los últimos días
        const posicionesUsadas = new Set<string>()
        for (const posiciones of posicionesPorDia.values()) {
          posiciones.forEach(pos => posicionesUsadas.add(pos))
        }
        
        return Array.from(posicionesUsadas)
        } catch (error) {
          console.error(`❌ Error al obtener historial del móvil ${movilId}:`, error)
          // En caso de error, devolver array vacío para permitir cualquier asignación
          return []
        }
      }

      // 🎯 Función para encontrar posiciones disponibles para un móvil
      function obtenerPosicionesDisponibles(posicionesUsadas: string[], posicionesYaAsignadas: Set<string>) {
        return posicionesFijas.filter(posicion => 
          !posicionesUsadas.includes(posicion) && !posicionesYaAsignadas.has(posicion)
        )
      }

      // 🎲 Función para barajar array aleatoriamente (Fisher-Yates)
      function shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
      }

      // 📊 Preparar móviles con prioridad
      const movilesQueDescansaronAyer = movilesFiltrados.filter(movil => 
        !movilesQueTrabajaronAyer.has(movil.id)
      )
      const movilesRestantes = movilesFiltrados.filter(movil => 
        movilesQueTrabajaronAyer.has(movil.id)
      )

      

      // 🎯 Detectar si es la primera vez (todos descansaron)
      const esPrimeraVez = movilesQueTrabajaronAyer.size === 0
      

      // 🎲 Crear arreglo final de móviles
      let movilesOrdenados: typeof movilesFiltrados
      if (esPrimeraVez) {
        // Si es primera vez, barajar todos los móviles por igual
        movilesOrdenados = shuffleArray(movilesFiltrados)
        
      } else {
        // Si hay historial, dar prioridad a los que descansaron
        movilesOrdenados = [
          ...movilesQueDescansaronAyer,
          ...shuffleArray(movilesRestantes)
        ]
        
      }

      

      // 🎯 Barajar también las posiciones para mayor aleatoriedad
      const posicionesMezcladas = shuffleArray(posicionesFijas)
      

      // 🎯 Variables de control
      const posicionesAsignadas = new Set<string>()
      const movilesAsignados = new Set<number>()
      const mapaAsignaciones = new Map<string, number>() // posicion -> movilId

      // 🔄 Algoritmo principal de asignación (por posición) con flexibilidad progresiva
      let posicionesAsignadasCount = 0
      let movilIndex = 0
      
      for (const posicion of posicionesMezcladas) {
        
        
        // Buscar el primer móvil disponible que pueda tomar esta posición
        let movilAsignado = null
        
        // FASE 1: Intentar con reglas estrictas (memoria de 2 días) - SOLO si NO es primera vez
        if (!esPrimeraVez) {
          for (const movil of movilesOrdenados) {
            if (movilesAsignados.has(movil.id)) continue

            const ultimasPosiciones = await obtenerUltimasPosiciones(movil.id, 2)
            
            if (!ultimasPosiciones.includes(posicion)) {
              posicionesAsignadas.add(posicion)
              movilesAsignados.add(movil.id)
              mapaAsignaciones.set(posicion, movil.id)
              movilAsignado = movil
              
          
              break
            }
          }
        }
        
        // FASE 2: Si no encontró con reglas estrictas, intentar con reglas flexibles (1 día) - SOLO si NO es primera vez
        if (!movilAsignado && !esPrimeraVez) {
        
          
          for (const movil of movilesOrdenados) {
            if (movilesAsignados.has(movil.id)) continue

            const ultimasPosiciones = await obtenerUltimasPosiciones(movil.id, 1)
            
            if (!ultimasPosiciones.includes(posicion)) {
              posicionesAsignadas.add(posicion)
              movilesAsignados.add(movil.id)
              mapaAsignaciones.set(posicion, movil.id)
              movilAsignado = movil
              
          
              break
            }
          }
        }
        
        // FASE 3: Si aún no encontró (o es primera vez), asignar cualquier móvil disponible (sin reglas)
        if (!movilAsignado) {
          const tipoAsignacion = esPrimeraVez ? 'primera vez' : 'sin reglas'
        
          
          // Buscar cualquier móvil no asignado
          for (const movil of movilesOrdenados) {
            if (movilesAsignados.has(movil.id)) continue
            
            posicionesAsignadas.add(posicion)
            movilesAsignados.add(movil.id)
            mapaAsignaciones.set(posicion, movil.id)
            movilAsignado = movil
            
        
            break
          }
        }
        
        // FASE 4: Si no hay más móviles únicos, permitir múltiples asignaciones
        if (!movilAsignado && movilesOrdenados.length > 0) {
        
          
          // Usar móviles en orden rotativo
          const movilRotativo = movilesOrdenados[movilIndex % movilesOrdenados.length]
          
          posicionesAsignadas.add(posicion)
          mapaAsignaciones.set(posicion, movilRotativo.id)
          movilAsignado = movilRotativo
          
        
          movilIndex++
        }
        
        if (movilAsignado) {
          posicionesAsignadasCount++
        } else {
          console.error(`❌ No se pudo asignar posición ${posicion} - sin móviles disponibles`)
        }
      }

      // 🎯 Asignar posiciones restantes con fallback inteligente
      const posicionesSinAsignar = posicionesFijas.filter(pos => !posicionesAsignadas.has(pos))
      
      if (posicionesSinAsignar.length > 0) {
      
        
        const movilesDisponibles = movilesFiltrados.filter(m => !movilesAsignados.has(m.id))
        
        for (const posicion of posicionesSinAsignar) {
          if (movilesDisponibles.length === 0) {
        
            break
          }
          
          // Intentar primero con móviles que descansaron ayer (si están disponibles)
          let movilElegido = movilesDisponibles.find(m => movilesQueDescansaronAyer.some(desc => desc.id === m.id))
          
          // Si no hay móviles que descansaron ayer, usar cualquiera aleatorio
          if (!movilElegido) {
            movilElegido = movilesDisponibles[Math.floor(Math.random() * movilesDisponibles.length)]
          }
          //cambio
          mapaAsignaciones.set(posicion, movilElegido.id)
          movilesAsignados.add(movilElegido.id)
          
          // Remover el móvil de disponibles para evitar múltiples asignaciones en el fallback
          const indice = movilesDisponibles.indexOf(movilElegido)
          movilesDisponibles.splice(indice, 1)
          
        
        }
      }

      // 🏗️ Crear programaciones basadas en las asignaciones
      const programaciones: any[] = []
      
      if (manual) {
        // Modo manual: crear programaciones sin móviles asignados
      
        
        for (const [posicion, _] of Object.entries(PLANTILLA_FIJA)) {
          const turnosDeLaPosicion = PLANTILLA_FIJA[posicion]
          
          // Crear programación para cada turno de la posición sin móvil
          turnosDeLaPosicion.forEach((turno) => {
            const rutaId = rutaMap.get(turno.ruta)
            if (!rutaId) {
              console.error(`❌ Ruta no encontrada: ${turno.ruta}`)
              return
            }
            
            // Convertir hora a número HHMM
            const [horas, minutos] = turno.hora.split(':').map(Number)
            const horaNumerico = horas * 100 + minutos
            
            programaciones.push({
              fecha: fechaObj,
              rutaId,
              hora: horaNumerico,
              automovilId: null // Sin móvil asignado en modo manual
            })
          })
        }
      } else {
        // Modo automático: crear programaciones con móviles asignados
        for (const [posicion, movilId] of mapaAsignaciones.entries()) {
          const turnosDeLaPosicion = PLANTILLA_FIJA[posicion]
          const movil = movilesFiltrados.find(m => m.id === movilId)
          
          if (!movil) continue
          
          // Crear programación para cada turno de la posición
          turnosDeLaPosicion.forEach((turno) => {
            const rutaId = rutaMap.get(turno.ruta)
            if (!rutaId) {
              console.error(`❌ Ruta no encontrada: ${turno.ruta}`)
              return
            }
            
            // Convertir hora a número HHMM
            const [horas, minutos] = turno.hora.split(':').map(Number)
            const horaNumerico = horas * 100 + minutos
            
            programaciones.push({
              fecha: fechaObj,
              rutaId,
              hora: horaNumerico,
              automovilId: movilId
            })
            
            // Contar asignación
            asignacionesPorMovil.set(movilId, (asignacionesPorMovil.get(movilId) || 0) + 1)
          })
        }
      }

      // 📊 Estadísticas de asignación
      const movilesEnDescansoHoy = movilesFiltrados.length - movilesAsignados.size
      

      // Guardar programaciones en la base de datos
      if (programaciones.length > 0) {
        await prismaWithRetry.programacion.createMany({
          data: programaciones
        })
      }
      //comentario

      // 📊 Calcular estadísticas finales del algoritmo equitativo
      const movilesConDobles = new Map()
      const distribucionPorRuta: Record<string, number> = {}
      
      asignacionesPorMovil.forEach((count, movilId) => {
        const movil = movilesFiltrados.find(m => m.id === movilId)
        if (movil && count > 1) {
          movilesConDobles.set(movil.movil, count)
        }
      })

      // Contar programaciones por ruta
      programaciones.forEach((p) => {
        const rutaEncontrada = rutasDB.find(r => r.id === p.rutaId)
        const rutaNombre = rutaEncontrada?.nombre || 'Desconocida'
        distribucionPorRuta[rutaNombre] = (distribucionPorRuta[rutaNombre] || 0) + 1
      })

      

      const totalMovilesFinal = movilesFiltrados.length
      const movilesAsignadosFinal = movilesAsignados.size
      const movilesEnDescansoFinal = totalMovilesFinal - movilesAsignadosFinal

      return {
        totalRutas: programaciones.length,
        totalMoviles: manual ? 0 : totalMovilesFinal,
        movilesAsignados: manual ? 0 : movilesAsignadosFinal,
        movilesEnDescanso: manual ? totalMovilesFinal : movilesEnDescansoFinal,
        movilesSinTrabajarAyer: movilesSinTrabajarAyer.size,
        modoManual: manual,
        estadisticas: {
          promedioAsignaciones: manual ? 0 : programaciones.length / totalMovilesFinal,
          distribucion: manual ? {} : Object.fromEntries(asignacionesPorMovil),
          distribucionPorRuta: distribucionPorRuta,
          dobles: manual ? {} : Object.fromEntries(movilesConDobles)
        }
      }
    });

    return NextResponse.json({
      message: manual ? 'Programación manual generada exitosamente (sin móviles asignados)' : 'Programación generada exitosamente con distribución equitativa',
      ...result
    })

  } catch (error) {
    console.error('Error al generar programación:', error)
    if (error instanceof Error && error.message === 'No hay móviles disponibles para programación') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al generar programación' }, { status: 500 })
  } finally {
    await prismaWithRetry.$disconnect();
  }
}
