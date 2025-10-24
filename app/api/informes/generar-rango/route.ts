import { NextRequest, NextResponse } from 'next/server'
import prismaWithRetry from '@/lib/prismaClient'
import ExcelJS from 'exceljs'

export async function POST(request: NextRequest) {
  try {
    const { fechaInicio, fechaFin } = await request.json()

    console.log('Fecha inicio:', fechaInicio)
    console.log('Fecha fin:', fechaFin)

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'Fecha inicial y final son requeridas' },
        { status: 400 }
      )
    }

    // Validar formato de fechas
    if (typeof fechaInicio !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
      return NextResponse.json(
        { error: 'Fecha inicial inválida: se requiere formato YYYY-MM-DD' },
        { status: 400 }
      )
    }

    if (typeof fechaFin !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
      return NextResponse.json(
        { error: 'Fecha final inválida: se requiere formato YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Validar que fecha inicial sea anterior o igual a fecha final
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      return NextResponse.json(
        { error: 'La fecha inicial debe ser anterior o igual a la fecha final' },
        { status: 400 }
      )
    }

    // Función para obtener inicio y fin de un rango de fechas
    function getStartAndEndFromDateRange(startDateStr: string, endDateStr: string) {
      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number)
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number)
      
      const start = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0))
      const end = new Date(Date.UTC(endYear, endMonth - 1, endDay + 1, 0, 0, 0, 0))
      
      return {
        inicio: start.toISOString(),
        fin: end.toISOString()
      }
    }

    const { inicio, fin } = getStartAndEndFromDateRange(fechaInicio, fechaFin)
    const fechaInicioDate = new Date(inicio)
    const fechaFinExclusivo = new Date(fin)

    console.log('Rango de fechas recibido:', fechaInicio, '-', fechaFin)
    console.log('Fecha inicio (ISO/UTC):', fechaInicioDate.toISOString())
    console.log('Fecha fin exclusiva (ISO/UTC):', fechaFinExclusivo.toISOString())

    // Obtener todos los turnos del rango de fechas especificado
    let turnos = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.turno.findMany({
        where: {
          fecha: {
            gte: fechaInicioDate,
            lt: fechaFinExclusivo
          }
        },
        include: {
          conductor: true,
          automovil: true,
          ruta: true
        },
        orderBy: [
          { fecha: 'asc' },
          { rutaId: 'asc' },
          { horaCreacion: 'asc' }
        ]
      })
    })

    // Obtener también los turnos programados para el rango de fechas especificado
    const turnosProgramados = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.programacion.findMany({
        where: {
          fecha: {
            gte: fechaInicioDate,
            lt: fechaFinExclusivo
          }
        },
        include: {
          automovil: true,
          ruta: true,
          realizadoPor: true,
          realizadoPorConductor: true
        },
        orderBy: [
          { fecha: 'asc' },
          { hora: 'asc' }
        ]
      })
    })

    console.log(`Buscando turnos y programaciones para rango: ${fechaInicio} - ${fechaFin}`)
    console.log(`Fecha inicio: ${fechaInicioDate.toISOString()}`)
    console.log(`Fecha fin exclusiva: ${fechaFinExclusivo.toISOString()}`)
    console.log(`Turnos encontrados: ${turnos.length}`)
    console.log(`Programaciones encontradas: ${turnosProgramados.length}`)

    if (turnos.length === 0 && turnosProgramados.length === 0) {
      return NextResponse.json(
        { 
          error: 'No se encontraron turnos ni programaciones para el rango de fechas especificado',
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          fechaInicioISO: fechaInicioDate.toISOString(),
          fechaFinISO: fechaFinExclusivo.toISOString()
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

    // Agrupar turnos por fecha y ruta
    const turnosPorFechaYRuta = turnos.reduce((acc, turno) => {
      const fechaKey = turno.fecha.toISOString().split('T')[0] // YYYY-MM-DD
      const rutaNombre = normalizarNombreRuta(turno.ruta?.nombre || 'Sin Ruta')
      
      if (!acc[fechaKey]) {
        acc[fechaKey] = {}
      }
      if (!acc[fechaKey][rutaNombre]) {
        acc[fechaKey][rutaNombre] = { turnos: [], programados: [] }
      }
      acc[fechaKey][rutaNombre].turnos.push(turno)
      return acc
    }, {} as Record<string, Record<string, { turnos: typeof turnos, programados: any[] }>>)

    // Agregar programados a las fechas y rutas correspondientes
    turnosProgramados.forEach(programado => {
      const fechaKey = programado.fecha.toISOString().split('T')[0] // YYYY-MM-DD
      const rutaOriginal = programado.ruta?.nombre || 'Sin Ruta'
      const rutaNombre = normalizarNombreRuta(rutaOriginal)
      
      if (!turnosPorFechaYRuta[fechaKey]) {
        turnosPorFechaYRuta[fechaKey] = {}
      }
      if (!turnosPorFechaYRuta[fechaKey][rutaNombre]) {
        turnosPorFechaYRuta[fechaKey][rutaNombre] = { turnos: [], programados: [] }
      }
      turnosPorFechaYRuta[fechaKey][rutaNombre].programados.push(programado)
    })

    // Crear el libro de Excel
    const workbook = new ExcelJS.Workbook()

    // Helper: convertir ISO a HH:mm usando horas/minutos en UTC
    function isoToTimeHHMM(isoString: string): string {
      try {
        const date = new Date(isoString)
        if (isNaN(date.getTime())) return ''
        const hours = String(date.getUTCHours()).padStart(2, '0')
        const minutes = String(date.getUTCMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
      } catch {
        return ''
      }
    }

    // Helper: formatear hora sin convertir a Date
    function formatHourString(hourStr: string): string {
      const normalized = hourStr.padStart(4, '0')
      const hours = normalized.slice(0, -2)
      const minutes = normalized.slice(-2)
      return `${hours}:${minutes}`
    }

    // Helper: convertir hora de Programacion a Date y string legible
    const obtenerHoraProgramado = (programado: any): { legible: string; horaOrden: number } => {
      let legible = ''
      let horaOrden = -1

      try {
        if (typeof programado.hora === 'number') {
          const horas = Math.floor(programado.hora / 100)
          const minutos = programado.hora % 100
          legible = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
          horaOrden = horas * 100 + minutos
        } else if (typeof programado.hora === 'string') {
          if (/^\d{3,4}$/.test(programado.hora)) {
            legible = formatHourString(programado.hora)
            horaOrden = parseInt(programado.hora, 10)
          } else {
            const m = programado.hora.match(/^(\d{1,2}):(\d{2})$/)
            if (m) {
              const horas = parseInt(m[1], 10)
              const minutos = parseInt(m[2], 10)
              legible = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
              horaOrden = horas * 100 + minutos
            } else if (typeof programado.hora === 'string' && programado.hora.includes('T')) {
              const hhmm = programado.hora.slice(11, 16)
              const m2 = hhmm.match(/^(\d{2}):(\d{2})$/)
              if (m2) {
                const horas = parseInt(m2[1], 10)
                const minutos = parseInt(m2[2], 10)
                legible = hhmm
                horaOrden = horas * 100 + minutos
              }
            }
          }
        }
      } catch (e) {
        console.error('Error formateando hora de programado:', programado?.hora, e)
      }

      return { legible, horaOrden }
    }

    // Crear una hoja por cada fecha
    const fechasOrdenadas = Object.keys(turnosPorFechaYRuta).sort()
    
    fechasOrdenadas.forEach(fecha => {
      const rutasEnFecha = turnosPorFechaYRuta[fecha]
      const worksheet = workbook.addWorksheet(`${fecha}`)
      
      let currentRow = 1

      // Título de la fecha
      worksheet.mergeCells(currentRow, 1, currentRow, 6)
      const tituloFecha = worksheet.getCell(currentRow, 1)
      tituloFecha.value = `INFORME DEL ${fecha}`
      tituloFecha.font = { bold: true, size: 14 }
      tituloFecha.alignment = { horizontal: 'center' }
      currentRow += 2

      // Para cada ruta en esta fecha
      Object.entries(rutasEnFecha).forEach(([rutaNombre, datosRuta]) => {
        console.log(`Procesando fecha ${fecha}, ruta: "${rutaNombre}" con ${datosRuta.turnos.length} turnos y ${datosRuta.programados.length} programados`)

        // Título de la ruta
        worksheet.mergeCells(currentRow, 1, currentRow, 6)
        const tituloRuta = worksheet.getCell(currentRow, 1)
        tituloRuta.value = rutaNombre
        tituloRuta.font = { bold: true, size: 12 }
        tituloRuta.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E7E6E6' } }
        currentRow += 1

        // ======= Tabla de PROGRAMADOS =======
        if (datosRuta.programados.length > 0) {
          worksheet.mergeCells(currentRow, 1, currentRow, 6)
          const tituloProg = worksheet.getCell(currentRow, 1)
          tituloProg.value = 'PROGRAMADOS'
          tituloProg.font = { bold: true }
          currentRow += 1

          // Encabezados Programados
          worksheet.getRow(currentRow).values = ['Hora Salida', 'Automóvil Asignado', 'Estado', 'Realizó por', 'Conductor', '']
          worksheet.getRow(currentRow).font = { bold: true, color: { argb: 'FFFFFF' } }
          worksheet.getRow(currentRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '70AD47' } }
          worksheet.getColumn(1).width = 15
          worksheet.getColumn(2).width = 14
          worksheet.getColumn(3).width = 12
          worksheet.getColumn(4).width = 12
          worksheet.getColumn(5).width = 48
          worksheet.getColumn(6).width = 18
          const headerProgRowIndex = currentRow
          currentRow += 1

          // Datos Programados
          const programadosDatos = datosRuta.programados.map((p) => {
            const { legible, horaOrden } = obtenerHoraProgramado(p)
            return {
              horaSalida: legible || '',
              movilAsignado: p?.automovil?.movil || '',
              estado: p?.estado || '',
              realizadoPorMovil: p?.realizadoPor?.movil || '',
              conductorRealizado: p?.realizadoPorConductor?.nombre || '',
              horaOrden
            }
          }).sort((a, b) => a.horaOrden - b.horaOrden)

          programadosDatos.forEach(d => {
            worksheet.getRow(currentRow).values = [d.horaSalida, d.movilAsignado, d.estado, d.realizadoPorMovil, d.conductorRealizado]
            currentRow += 1
          })

          // Bordes para tabla de programados
          for (let r = headerProgRowIndex; r < currentRow; r++) {
            worksheet.getRow(r).eachCell((cell) => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
            })
          }

          currentRow += 1
        }

        // ======= Tabla de TURNOS =======
        if (datosRuta.turnos.length > 0) {
          worksheet.mergeCells(currentRow, 1, currentRow, 5)
          const tituloTurnos = worksheet.getCell(currentRow, 1)
          tituloTurnos.value = 'TURNOS'
          tituloTurnos.font = { bold: true }
          currentRow += 1

          // Encabezados Turnos
          worksheet.getRow(currentRow).values = ['Hora Salida', 'Móvil', 'Placa', 'Conductor', '']
          worksheet.getRow(currentRow).font = { bold: true, color: { argb: 'FFFFFF' } }
          worksheet.getRow(currentRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } }
          worksheet.getColumn(1).width = 15
          worksheet.getColumn(2).width = 12
          worksheet.getColumn(3).width = 15
          worksheet.getColumn(4).width = 30
          const headerTurnoRowIndex = currentRow
          currentRow += 1

          const turnosOrdenados = datosRuta.turnos.map(t => {
            const fecha = t.horaSalida ? new Date(t.horaSalida) : new Date(0)
            const iso = t.horaSalida
              ? (t.horaSalida instanceof Date ? t.horaSalida.toISOString() : String(t.horaSalida))
              : ''
            return {
              horaSalidaDate: fecha,
              horaHHMM: iso ? isoToTimeHHMM(iso) : '',
              movil: t?.automovil?.movil || '',
              placa: t?.automovil?.placa || '',
              conductor: t?.conductor?.nombre || ''
            }
          }).sort((a, b) => a.horaSalidaDate.getTime() - b.horaSalidaDate.getTime())

          turnosOrdenados.forEach(t => {
            worksheet.getRow(currentRow).values = [t.horaHHMM, t.movil, t.placa, t.conductor]
            currentRow += 1
          })

          // Bordes para tabla de turnos
          for (let r = headerTurnoRowIndex; r < currentRow; r++) {
            worksheet.getRow(r).eachCell((cell) => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
            })
          }
        }

        currentRow += 2 // Espacio entre rutas
      })
    })

    // Generar el archivo
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="informe-turnos-rango-${fechaInicio}-${fechaFin}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error generando informe por rango:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}