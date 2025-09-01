import prismaWithRetry from '@/lib/prismaClient'
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
    const { fecha } = await request.json()

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

        // Asegurarse de que todas las rutas de RUTAS_HORARIOS existan en la base de datos
        for (const rutaNombre of Object.keys(RUTAS_HORARIOS)) {
          if (!rutaMap.has(rutaNombre)) {
            console.log(`➕ Creando ruta faltante en BD: ${rutaNombre}`)
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

      console.log('🚗 Móviles disponibles para programación:', {
        totalMoviles: movilesFiltrados.length,
        moviles: movilesFiltrados.map(m => `${m.movil} (ID: ${m.id})`).slice(0, 10),
        totalMostrados: Math.min(10, movilesFiltrados.length),
        hayMas: movilesFiltrados.length > 10
      })

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

      // Crear lista de todas las rutas con horarios
      const todasLasRutas: Array<{ ruta: string; hora: Date }> = []
      for (const [ruta, horarios] of Object.entries(RUTAS_HORARIOS)) {
        for (const hora of horarios) {
          const horaDate = horaStringToDate(hora, fechaObj)
          todasLasRutas.push({ ruta, hora: horaDate })
        }
      }

      // Ordenar por hora
      todasLasRutas.sort((a, b) => a.hora.getTime() - b.hora.getTime())

      console.log('📋 Programaciones a generar:', {
        totalRutas: todasLasRutas.length,
        rutasPorDespacho: Object.fromEntries(
          Object.entries(RUTAS_HORARIOS).map(([ruta, horarios]) => [ruta, horarios.length])
        ),
        todasLasRutas: todasLasRutas.map(r => ({
          ruta: r.ruta,
          hora: r.hora.toTimeString().slice(0, 5)
        }))
      })

      // Eliminar programación existente para esta fecha
      await prismaWithRetry.programacion.deleteMany({
        where: {
          fecha: fechaObj
        }
      })

      // Algoritmo que respeta exactamente RUTAS_HORARIOS
      const programaciones = []
      const asignacionesPorMovil = new Map()
      const rutaHorarioUsados = new Set() // Para evitar duplicados exactos ruta-hora
      const movilesYaAsignados = new Set() // Para evitar que un móvil sea asignado más de una vez

      // Inicializar contador de asignaciones
      movilesFiltrados.forEach(movil => {
        asignacionesPorMovil.set(movil.id, 0)
      })

      // Generar programaciones respetando exactamente RUTAS_HORARIOS
      for (const { ruta, hora } of todasLasRutas) {
        const horaNumerico = hora.getHours() * 100 + hora.getMinutes()
        const claveRutaHorario = `${ruta}-${horaNumerico}`
        
        // Verificar que no se duplique esta combinación EXACTA de ruta-hora
        if (rutaHorarioUsados.has(claveRutaHorario)) {
          console.warn(`⚠️ Combinación ruta-hora duplicada: ${ruta} a las ${hora.toTimeString().slice(0, 5)} - saltando`)
          continue
        }
        
        // Encontrar el mejor móvil para esta ruta específica
        let mejorMovil = null
        let mejorPuntuacion = -Infinity

        const puntuacionesMoviles = []
        for (const movil of movilesFiltrados) {
          // RESTRICCIÓN CRÍTICA: Saltar móviles que ya fueron asignados hoy
          if (movilesYaAsignados.has(movil.id)) {
            continue
          }

          // Calcular puntuación para este móvil y ruta
          const puntuacion = calcularPuntuacion(
            movil.id,
            ruta,
            historial,
            fechaObj,
            movilesSinTrabajarAyer
          )

          // Penalizar móviles que ya tienen muchas asignaciones
          const asignacionesActuales = asignacionesPorMovil.get(movil.id) || 0
          const puntuacionFinal = puntuacion - (asignacionesActuales * 50)

          puntuacionesMoviles.push({
            movil: movil.movil,
            id: movil.id,
            puntuacionBase: puntuacion,
            asignacionesActuales,
            puntuacionFinal,
            yaAsignado: false
          })

          if (puntuacionFinal > mejorPuntuacion) {
            mejorPuntuacion = puntuacionFinal
            mejorMovil = movil
          }
        }

        // Log solo para los primeros 3 slots para no llenar la consola
        if (programaciones.length < 3) {
          console.log(`🎯 Puntuaciones para ${ruta} a las ${hora.toTimeString().slice(0, 5)}:`)
          const topPuntuaciones = puntuacionesMoviles
            .sort((a, b) => b.puntuacionFinal - a.puntuacionFinal)
            .slice(0, 5)
          topPuntuaciones.forEach((p, i) => {
            const marca = i === 0 ? '👑' : '  '
            console.log(`${marca} ${p.movil}: base=${p.puntuacionBase}, asignaciones=${p.asignacionesActuales}, final=${p.puntuacionFinal}`)
          })
          
          // Advertencia si hay pocas opciones disponibles
          if (puntuacionesMoviles.length < 3) {
            console.warn(`⚠️ POCAS OPCIONES: Solo ${puntuacionesMoviles.length} móviles disponibles para ${ruta}. El sistema de puntos puede verse limitado.`)
          }
        }

        // Si no se encontró móvil, usar el que menos asignaciones tiene de los NO asignados
        if (!mejorMovil) {
          const movilesNoAsignados = movilesFiltrados.filter(m => !movilesYaAsignados.has(m.id))
          
          if (movilesNoAsignados.length > 0) {
            mejorMovil = movilesNoAsignados.reduce((menosAsignado, movil) => {
              const asignacionesMenos = asignacionesPorMovil.get(menosAsignado.id) || 0
              const asignacionesActual = asignacionesPorMovil.get(movil.id) || 0
              return asignacionesActual < asignacionesMenos ? movil : menosAsignado
            })
          } else {
            console.warn(`⚠️ Todos los móviles ya están asignados. Faltan ${todasLasRutas.length - programaciones.length} rutas por asignar.`)
          }
        }

        if (mejorMovil) {
          // Marcar esta combinación ruta-hora como usada
          rutaHorarioUsados.add(claveRutaHorario)
          asignacionesPorMovil.set(mejorMovil.id, (asignacionesPorMovil.get(mejorMovil.id) || 0) + 1)
          
          // CRÍTICO: Marcar este móvil como ya asignado para evitar reutilización
          movilesYaAsignados.add(mejorMovil.id)

          // Obtener el rutaId directamente de rutaMap, ya que ahora todas las rutas existen en BD
          const rutaId = rutaMap.get(ruta)
          
          if (rutaId) {
            programaciones.push({
              fecha: fechaObj,
              rutaId,
              hora: horaNumerico,
              automovilId: mejorMovil.id
            })
            
            console.log(`✅ Programación creada: ${ruta} a las ${hora.toTimeString().slice(0, 5)} → Móvil ${mejorMovil.movil}`)
          }
        } else {
          console.warn(`⚠️ No se encontró móvil disponible para: ${ruta} a las ${hora.toTimeString().slice(0, 5)}`)
        }
      }

      // Guardar programaciones en la base de datos
      if (programaciones.length > 0) {
        await prismaWithRetry.programacion.createMany({
          data: programaciones
        })
      }

          console.log('✅ Programaciones generadas:', {
      totalGeneradas: programaciones.length,
      programacionesPorRuta: programaciones.reduce((acc, p) => {
        const rutaOriginal = todasLasRutas.find(r => 
          r.hora.getHours() * 100 + r.hora.getMinutes() === p.hora && 
          rutaMap.get(r.ruta) === p.rutaId
        )?.ruta || 'Desconocida'
        acc[rutaOriginal] = (acc[rutaOriginal] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      distribucionMoviles: Object.fromEntries(asignacionesPorMovil),
      estadisticasPuntuacion: {
        totalMovilesDisponibles: movilesFiltrados.length,
        movilesAsignados: movilesYaAsignados.size,
        movilesSinAsignar: movilesFiltrados.length - movilesYaAsignados.size,
        porcentajeUtilizacion: Math.round((movilesYaAsignados.size / movilesFiltrados.length) * 100)
      }
    })

      // Calcular estadísticas
      const totalMoviles = movilesFiltrados.length
      const movilesAsignados = new Set(programaciones.map(p => p.automovilId)).size
      const movilesEnDescanso = totalMoviles - movilesAsignados

      return {
        totalRutas: programaciones.length,
        totalMoviles,
        movilesAsignados,
        movilesEnDescanso,
        movilesSinTrabajarAyer: movilesSinTrabajarAyer.size,
        estadisticas: {
          promedioAsignaciones: programaciones.length / totalMoviles,
          distribucion: Object.fromEntries(asignacionesPorMovil)
        }
      }
    });

    return NextResponse.json({
      message: 'Programación generada exitosamente con distribución equitativa',
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
