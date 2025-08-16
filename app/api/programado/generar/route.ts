import { prisma } from '@/src/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Definición de rutas y horarios
const RUTAS_HORARIOS = {
  'Despacho A': [
    '05:00', '05:10', '05:20', '05:28', '05:36', '05:44', '05:52',
    '06:00', '06:10', '06:20', '06:30', '06:40', '06:50', '07:00'
  ],
  'Despacho B': [
    '04:55', '05:05', '05:15', '05:25', '05:33', '05:41', '05:49', '05:57',
    '06:05', '06:15', '06:25', '06:35', '06:45', '06:55'
  ],
  'Despacho C': [
    '05:00', '05:10', '05:20', '05:30', '05:40', '05:50',
    '06:00', '06:10', '06:30', '06:50', '07:10', '07:30', '07:50', '08:10'
  ],
  'DESPACHO D. RUT7 CORZO LORETO': [
    '04:50', '04:57', '05:04', '05:11'
  ],
  'DESPACHO E RUT7 CORZO': [
    '04:55', '05:05', '05:15'
  ],
  'DESPACHO D RUT4 PAMPA-CORZO': [
    '04:50', '05:00', '05:10'
  ]
}

// Función para convertir string de hora a Date
function horaStringToDate(horaString: string, fecha: Date): Date {
  const [horas, minutos] = horaString.split(':').map(Number)
  const fechaHora = new Date(fecha)
  fechaHora.setHours(horas, minutos, 0, 0)
  return fechaHora
}

// Función para obtener el grupo de despacho (para validaciones)
function getDespachoGroup(ruta: string): string {
  const despachosZ = [
    'DESPACHO D. RUT7 CORZO LORETO',
    'DESPACHO E RUT7 CORZO', 
    'DESPACHO D RUT4 PAMPA-CORZO'
  ]
  
  if (despachosZ.includes(ruta)) {
    return 'Despacho Z'
  }
  return ruta
}

// Función para calcular puntuación de un móvil para una ruta específica
function calcularPuntuacion(
  movilId: number,
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
    h.movilId === movilId && 
    new Date(h.fecha) >= fechaLimite
  )
  
  // Verificar si el móvil no trabajó ayer (prioridad alta)
  if (movilesSinTrabajarAyer.has(movilId)) {
    puntuacion += 1000 // Prioridad muy alta
  }
  
  // Verificar si el móvil ya hizo esta ruta en los últimos 2 días
  const grupoRuta = getDespachoGroup(ruta)
  const rutasRecientes = historialReciente.map(h => getDespachoGroup(h.ruta))
  
  if (rutasRecientes.includes(grupoRuta)) {
    puntuacion -= 500 // Penalización alta por repetición
  }
  
  // Penalizar por muchas rutas recientes (evitar sobrecarga)
  const rutasUltimos2Dias = historialReciente.length
  puntuacion -= rutasUltimos2Dias * 10
  
  // Bonus por variedad de rutas
  const rutasUnicas = new Set(rutasRecientes).size
  puntuacion += rutasUnicas * 50
  
  // Bonus aleatorio para evitar patrones predecibles
  puntuacion += Math.random() * 10
  
  return puntuacion
}

export async function POST(request: NextRequest) {
  try {
    const { fecha } = await request.json()

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    }

    const fechaObj = new Date(fecha)

    // Obtener todos los móviles activos y disponibles
    const movilesDisponibles = await prisma.automovil.findMany({
      where: {
        activo: true,
        disponible: true
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
      return NextResponse.json({ error: 'No hay móviles disponibles para programación' }, { status: 400 })
    }

    // Obtener historial de programación de los últimos 7 días
    const fechaInicio = new Date(fechaObj)
    fechaInicio.setDate(fechaInicio.getDate() - 7)
    
    const historial = await prisma.programacion.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lt: fechaObj
        }
      },
      select: {
        movilId: true,
        ruta: true,
        fecha: true
      }
    })

    // Identificar móviles que no trabajaron ayer
    const fechaAyer = new Date(fechaObj)
    fechaAyer.setDate(fechaAyer.getDate() - 1)
    
    const programacionesAyer = historial.filter(h => {
      const fechaHistorial = new Date(h.fecha)
      return fechaHistorial.toDateString() === fechaAyer.toDateString()
    })
    
    const movilesQueTrabajaronAyer = new Set(programacionesAyer.map(p => p.movilId))
    const movilesSinTrabajarAyer = new Set(
      movilesFiltrados
        .filter(m => !movilesQueTrabajaronAyer.has(m.id))
        .map(m => m.id)
    )

    // Crear lista de todas las rutas con horarios
    const todasLasRutas = []
    for (const [ruta, horarios] of Object.entries(RUTAS_HORARIOS)) {
      for (const hora of horarios) {
        const horaDate = horaStringToDate(hora, fechaObj)
        todasLasRutas.push({ ruta, hora: horaDate })
      }
    }

    // Ordenar por hora
    todasLasRutas.sort((a, b) => a.hora.getTime() - b.hora.getTime())

    // Eliminar programación existente para esta fecha
    await prisma.programacion.deleteMany({
      where: {
        fecha: fechaObj
      }
    })

    // Algoritmo de distribución equitativa mejorado
    const programaciones = []
    const movilesUsados = new Set()
    const asignacionesPorMovil = new Map()

    // Inicializar contador de asignaciones
    movilesFiltrados.forEach(movil => {
      asignacionesPorMovil.set(movil.id, 0)
    })

    for (let i = 0; i < todasLasRutas.length; i++) {
      const { ruta, hora } = todasLasRutas[i]
      
      // Encontrar el mejor móvil para esta ruta
      let mejorMovil = null
      let mejorPuntuacion = -Infinity

      for (const movil of movilesFiltrados) {
        // Verificar si el móvil ya fue usado en esta fecha
        if (movilesUsados.has(movil.id)) continue

        // Calcular puntuación para este móvil y ruta
        const puntuacion = calcularPuntuacion(
          movil.id,
          ruta,
          historial,
          fechaObj,
          movilesSinTrabajarAyer
        )

        if (puntuacion > mejorPuntuacion) {
          mejorPuntuacion = puntuacion
          mejorMovil = movil
        }
      }

      // Si no se encontró móvil disponible, usar el que menos rutas ha hecho
      if (!mejorMovil) {
        mejorMovil = movilesFiltrados.find(movil => !movilesUsados.has(movil.id))
      }

      if (mejorMovil) {
        movilesUsados.add(mejorMovil.id)
        asignacionesPorMovil.set(mejorMovil.id, (asignacionesPorMovil.get(mejorMovil.id) || 0) + 1)

        programaciones.push({
          fecha: fechaObj,
          ruta,
          hora: hora.toISOString(),
          movilId: mejorMovil.id,
          disponible: false
        })
      }
    }

    // Guardar programaciones en la base de datos
    if (programaciones.length > 0) {
      await prisma.programacion.createMany({
        data: programaciones
      })
    }

    // Calcular estadísticas
    const totalMoviles = movilesFiltrados.length
    const movilesAsignados = movilesUsados.size
    const movilesEnDescanso = totalMoviles - movilesAsignados

    return NextResponse.json({
      message: 'Programación generada exitosamente con distribución equitativa',
      totalRutas: programaciones.length,
      totalMoviles,
      movilesAsignados,
      movilesEnDescanso,
      movilesSinTrabajarAyer: movilesSinTrabajarAyer.size,
      estadisticas: {
        promedioAsignaciones: programaciones.length / totalMoviles,
        distribucion: Object.fromEntries(asignacionesPorMovil)
      }
    })

  } catch (error) {
    console.error('Error al generar programación:', error)
    return NextResponse.json({ error: 'Error al generar programación' }, { status: 500 })
  }
}
