import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import ExcelJS from 'exceljs'

export async function POST(request: NextRequest) {
  try {
    const { fecha } = await request.json()

    if (!fecha) {
      return NextResponse.json(
        { error: 'Fecha es requerida' },
        { status: 400 }
      )
    }

    // Convertir la fecha a objetos Date para el inicio y fin del día
    const fechaInicio = new Date(fecha)
    fechaInicio.setHours(0, 0, 0, 0)
    
    const fechaFin = new Date(fecha)
    fechaFin.setHours(23, 59, 59, 999)

    // Obtener todos los turnos de la fecha especificada
    // Primero intentar por fecha, luego por horaCreacion
    let turnos = await prisma.turno.findMany({
      where: {
        OR: [
          {
            fecha: {
              gte: fechaInicio,
              lte: fechaFin
            }
          },
          {
            horaCreacion: {
              gte: fechaInicio,
              lte: fechaFin
            }
          }
        ]
      },
      include: {
        conductor: true,
        automovil: true,
        ruta: true
      },
      orderBy: [
        { rutaId: 'asc' },
        { horaCreacion: 'asc' }
      ]
    })

    // Obtener también los turnos programados para la fecha especificada
    const turnosProgramados = await prisma.programacion.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      include: {
        automovil: true,
        ruta: true
      },
      orderBy: [
        { hora: 'asc' }
      ]
    })

    // Si no se encuentran turnos, buscar por cualquier fecha que contenga la fecha seleccionada
    if (turnos.length === 0) {
      console.log('No se encontraron turnos con filtro estricto, buscando con filtro más amplio...')
      
      // Buscar turnos que tengan la fecha en cualquier campo de fecha
      turnos = await prisma.turno.findMany({
        where: {
          OR: [
            {
              fecha: {
                gte: new Date(fecha + 'T00:00:00.000Z'),
                lte: new Date(fecha + 'T23:59:59.999Z')
              }
            },
            {
              horaCreacion: {
                gte: new Date(fecha + 'T00:00:00.000Z'),
                lte: new Date(fecha + 'T23:59:59.999Z')
              }
            },
            {
              horaSalida: {
                gte: new Date(fecha + 'T00:00:00.000Z'),
                lte: new Date(fecha + 'T23:59:59.999Z')
              }
            }
          ]
        },
        include: {
          conductor: true,
          automovil: true,
          ruta: true
        },
        orderBy: [
          { rutaId: 'asc' },
          { horaCreacion: 'asc' }
        ]
      })
    }

    console.log(`Buscando turnos y programaciones para fecha: ${fecha}`)
    console.log(`Fecha inicio: ${fechaInicio.toISOString()}`)
    console.log(`Fecha fin: ${fechaFin.toISOString()}`)
    console.log(`Turnos encontrados: ${turnos.length}`)
    console.log(`Programaciones encontradas: ${turnosProgramados.length}`)
    
    // Mostrar información de los turnos encontrados para depuración
    if (turnos.length > 0) {
      console.log('Turnos encontrados:')
      turnos.forEach((turno, index) => {
        console.log(`${index + 1}. ID: ${turno.id}, Fecha: ${turno.fecha}, HoraCreacion: ${turno.horaCreacion}, Conductor: ${turno.conductor.nombre}`)
      })
    }

    if (turnosProgramados.length > 0) {
      console.log('Programaciones encontradas:')
      turnosProgramados.forEach((programado, index) => {
        console.log(`${index + 1}. ID: ${programado.id}, Fecha: ${programado.fecha}, Hora: "${programado.hora}" (tipo: ${typeof programado.hora}), Ruta: ${programado.ruta?.nombre || 'N/A'}, Móvil: ${programado.automovil?.movil || 'N/A'}`)
      })
    }

    if (turnos.length === 0 && turnosProgramados.length === 0) {
      return NextResponse.json(
        { 
          error: 'No se encontraron turnos ni programaciones para la fecha especificada',
          fecha: fecha,
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString()
        },
        { status: 404 }
      )
    }

    // Función para normalizar nombres de rutas
    const normalizarNombreRuta = (nombre: string): string => {
      if (!nombre) return 'Sin Ruta'
      
      const nombreLower = nombre.toLowerCase().trim()
      
      // Casos especiales para Despacho D con rutas específicas
      if (nombreLower.includes('despacho d') && nombreLower.includes('ruta4')) {
        return 'Despacho D Ruta4'
      }
      if (nombreLower.includes('despacho d') && nombreLower.includes('ruta7')) {
        return 'Despacho D Ruta7'
      }
      
      // Casos específicos para los nombres exactos que vimos en los logs
      if (nombreLower.includes('despacho d') && nombreLower.includes('rut4')) {
        return 'Despacho D Ruta4'
      }
      if (nombreLower.includes('despacho d') && nombreLower.includes('rut7')) {
        return 'Despacho D Ruta7'
      }
      
      // Normalizar rutas que empiezan con "despacho"
      if (nombreLower.startsWith('despacho')) {
        // Extraer la letra después de "despacho"
        const match = nombreLower.match(/despacho\s*([a-z])/i)
        if (match) {
          return `Despacho ${match[1].toUpperCase()}`
        }
      }
      
      // Si es solo una letra (A, B, C, etc.), convertir a "Despacho X"
      if (/^[a-z]$/i.test(nombreLower)) {
        return `Despacho ${nombreLower.toUpperCase()}`
      }
      
      // Si contiene "RUT" seguido de un número, extraer solo la letra
      const rutMatch = nombreLower.match(/rut\s*([a-z])/i)
      if (rutMatch) {
        return `Despacho ${rutMatch[1].toUpperCase()}`
      }
      
      return nombre
    }

    // Agrupar turnos por ruta (incluyendo programados)
    const turnosPorRuta = turnos.reduce((acc, turno) => {
      const rutaNombre = normalizarNombreRuta(turno.ruta?.nombre || 'Sin Ruta')
      if (!acc[rutaNombre]) {
        acc[rutaNombre] = { turnos: [], programados: [] }
      }
      acc[rutaNombre].turnos.push(turno)
      return acc
    }, {} as Record<string, { turnos: typeof turnos, programados: any[] }>)

    // Agregar programados a las rutas correspondientes
    turnosProgramados.forEach(programado => {
      const rutaOriginal = programado.ruta?.nombre || 'Sin Ruta'
      const rutaNombre = normalizarNombreRuta(rutaOriginal)
      console.log(`Ruta original: "${rutaOriginal}" -> Normalizada: "${rutaNombre}"`)
      
      if (!turnosPorRuta[rutaNombre]) {
        turnosPorRuta[rutaNombre] = { turnos: [], programados: [] }
      }
      turnosPorRuta[rutaNombre].programados.push(programado)
    })

    // Crear el libro de Excel
    const workbook = new ExcelJS.Workbook()

    // Helper: convertir hora de Programacion a Date y string legible (maneja número como 800 -> 08:00)
    const obtenerHoraProgramado = (programado: any): { legible: string; fechaHora: Date } => {
      const zona = 'America/Bogota'
      let fechaHora = new Date(0)
      let legible = 'N/A'

      try {
        const fechaBase = new Date(programado.fecha)
        const year = fechaBase.getFullYear()
        const month = fechaBase.getMonth()
        const day = fechaBase.getDate()

        if (typeof programado.hora === 'number') {
          const horas = Math.floor(programado.hora / 100)
          const minutos = programado.hora % 100
          fechaHora = new Date(year, month, day, horas, minutos, 0, 0)
        } else if (typeof programado.hora === 'string') {
          // Intentar HH:mm
          const m = programado.hora.match(/^(\d{1,2}):(\d{2})$/)
          if (m) {
            const horas = parseInt(m[1], 10)
            const minutos = parseInt(m[2], 10)
            fechaHora = new Date(year, month, day, horas, minutos, 0, 0)
          } else {
            // Intentar parsear como fecha completa
            const d = new Date(programado.hora)
            if (!isNaN(d.getTime())) {
              fechaHora = d
            }
          }
        } else if (programado.hora instanceof Date) {
          fechaHora = programado.hora
        }

        if (!isNaN(fechaHora.getTime())) {
          legible = fechaHora.toLocaleTimeString('es-CO', {
            timeZone: zona,
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      } catch (e) {
        console.error('Error convirtiendo hora de programado:', programado?.hora, e)
      }

      return { legible, fechaHora }
    }

    // Para cada ruta, crear una hoja con dos tablas: Programados y Turnos
    Object.entries(turnosPorRuta).forEach(([rutaNombre, datosRuta]) => {
      console.log(`Creando hoja: "${rutaNombre}" con ${datosRuta.turnos.length} turnos y ${datosRuta.programados.length} programados`)
      const worksheet = workbook.addWorksheet(rutaNombre)

      let currentRow = 1

      // ======= Tabla de PROGRAMADOS =======
      // Título
      worksheet.mergeCells(currentRow, 1, currentRow, 4)
      const tituloProg = worksheet.getCell(currentRow, 1)
      tituloProg.value = 'PROGRAMADOS'
      tituloProg.font = { bold: true }
      currentRow += 1

      // Encabezados Programados (sin Conductor)
      worksheet.getRow(currentRow).values = ['Hora Salida', 'Móvil', 'Placa', '']
      worksheet.getRow(currentRow).font = { bold: true, color: { argb: 'FFFFFF' } }
      worksheet.getRow(currentRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '70AD47' } }
      worksheet.getColumn(1).width = 15
      worksheet.getColumn(2).width = 12
      worksheet.getColumn(3).width = 15
      worksheet.getColumn(4).width = 2
      const headerProgRowIndex = currentRow
      currentRow += 1

      // Datos Programados
      const programadosDatos = datosRuta.programados.map((p) => {
        const { legible, fechaHora } = obtenerHoraProgramado(p)
        return {
          horaSalida: legible,
          movil: p.automovil.movil,
          placa: p.automovil.placa,
          fechaHora
        }
      }).sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())

      programadosDatos.forEach(d => {
        worksheet.getRow(currentRow).values = [d.horaSalida, d.movil, d.placa]
        currentRow += 1
      })

      // Bordes para tabla de programados
      for (let r = headerProgRowIndex; r < currentRow; r++) {
        worksheet.getRow(r).eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        })
      }

      // Espacio entre tablas
      currentRow += 1

      // ======= Tabla de TURNOS =======
      worksheet.mergeCells(currentRow, 1, currentRow, 5)
      const tituloTurnos = worksheet.getCell(currentRow, 1)
      tituloTurnos.value = 'TURNOS'
      tituloTurnos.font = { bold: true }
      currentRow += 1

      // Encabezados Turnos (incluye Conductor)
      worksheet.getRow(currentRow).values = ['Hora Salida', 'Móvil', 'Placa', 'Conductor', '']
      worksheet.getRow(currentRow).font = { bold: true, color: { argb: 'FFFFFF' } }
      worksheet.getRow(currentRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } }
      worksheet.getColumn(1).width = 15
      worksheet.getColumn(2).width = 12
      worksheet.getColumn(3).width = 15
      worksheet.getColumn(4).width = 30
      worksheet.getColumn(5).width = 2
      const headerTurnoRowIndex = currentRow
      currentRow += 1

      const turnosOrdenados = datosRuta.turnos.map(t => ({
        horaSalida: t.horaSalida ? new Date(t.horaSalida) : new Date(0),
        movil: t.automovil.movil,
        placa: t.automovil.placa,
        conductor: t.conductor?.nombre || 'N/A'
      })).sort((a, b) => a.horaSalida.getTime() - b.horaSalida.getTime())

      turnosOrdenados.forEach(t => {
        const horaStr = t.horaSalida.getTime() > 0
          ? t.horaSalida.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })
          : 'N/A'
        worksheet.getRow(currentRow).values = [horaStr, t.movil, t.placa, t.conductor]
        currentRow += 1
      })

      // Bordes para tabla de turnos
      for (let r = headerTurnoRowIndex; r < currentRow; r++) {
        worksheet.getRow(r).eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        })
      }
    })

    // Generar el archivo
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="informe-turnos-${fecha}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error generando informe:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}