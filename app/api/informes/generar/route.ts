import { NextRequest, NextResponse } from 'next/server'
import prismaWithRetry from '@/lib/prismaClient'
import ExcelJS from 'exceljs'

export async function POST(request: NextRequest) {
  try {
    const { fecha } = await request.json()

    console.log(fecha)
    console.log(typeof fecha)

    if (!fecha) {
      return NextResponse.json(
        { error: 'Fecha es requerida' },
        { status: 400 }
      )
    }

    // Usar función propuesta: interpreta la fecha "YYYY-MM-DD" en límites UTC
    function getStartAndEndFromDateString(dateStr: string) {
      const [year, month, day] = dateStr.split('-').map(Number)
      const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))
      return {
        inicio: start.toISOString(),
        fin: end.toISOString()
      }
    }

    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json(
        { error: 'Fecha inválida: se requiere formato YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const { inicio, fin } = getStartAndEndFromDateString(fecha)
    const fechaInicio = new Date(inicio)
    const fechaFinExclusivo = new Date(fin)

    console.log('Fecha recibida:', fecha)
    console.log('Fecha inicio (ISO/UTC):', fechaInicio.toISOString())
    console.log('Fecha fin exclusiva (ISO/UTC):', fechaFinExclusivo.toISOString())

    // Obtener todos los turnos de la fecha especificada (mismo criterio que Programacion)
    let turnos = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.turno.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lt: fechaFinExclusivo
        }
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
    })

    // Obtener también los turnos programados para la fecha especificada
    const turnosProgramados = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.programacion.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
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
        { hora: 'asc' }
      ]
      })
    })

    // Se elimina el fallback amplio para asegurar que los turnos sean estrictamente del día solicitado

    console.log(`Buscando turnos y programaciones para fecha: ${fecha}`)
    console.log(`Fecha inicio: ${fechaInicio.toISOString()}`)
    console.log(`Fecha fin exclusiva: ${fechaFinExclusivo.toISOString()}`)
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
          fechaFin: fechaFinExclusivo.toISOString()
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

    // Helper: convertir ISO a HH:mm usando horas/minutos en UTC (como viene de la base de datos)
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

    // Helper: formatear hora sin convertir a Date (ej: "450" -> "04:50")
    function formatHourString(hourStr: string): string {
      const normalized = hourStr.padStart(4, '0')
      const hours = normalized.slice(0, -2)
      const minutes = normalized.slice(-2)
      return `${hours}:${minutes}`
    }

    // Helper: convertir hora de Programacion a Date y string legible (maneja número como 800 -> 08:00)
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
          // Si viene como "450" o "0930"
          if (/^\d{3,4}$/.test(programado.hora)) {
            legible = formatHourString(programado.hora)
            horaOrden = parseInt(programado.hora, 10)
          } else {
            // Si viene como "HH:mm"
            const m = programado.hora.match(/^(\d{1,2}):(\d{2})$/)
            if (m) {
              const horas = parseInt(m[1], 10)
              const minutos = parseInt(m[2], 10)
              legible = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
              horaOrden = horas * 100 + minutos
            } else if (typeof programado.hora === 'string' && programado.hora.includes('T')) {
              // Último recurso: extraer HH:mm del ISO sin crear Date
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

    // Para cada ruta, crear una hoja con dos tablas: Programados y Turnos
    Object.entries(turnosPorRuta).forEach(([rutaNombre, datosRuta]) => {
      console.log(`Creando hoja: "${rutaNombre}" con ${datosRuta.turnos.length} turnos y ${datosRuta.programados.length} programados`)
      const worksheet = workbook.addWorksheet(rutaNombre)

      let currentRow = 1

      // ======= Tabla de PROGRAMADOS =======
      // Título
      worksheet.mergeCells(currentRow, 1, currentRow, 6)
      const tituloProg = worksheet.getCell(currentRow, 1)
      tituloProg.value = 'PROGRAMADOS'
      tituloProg.font = { bold: true }
      currentRow += 1

      // Encabezados Programados según requisitos
      worksheet.getRow(currentRow).values = ['Hora Salida', 'Automóvil Asignado', 'Estado', 'Realizó por', 'Conductor', '']
      worksheet.getRow(currentRow).font = { bold: true, color: { argb: 'FFFFFF' } }
      worksheet.getRow(currentRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '70AD47' } }
      worksheet.getColumn(1).width = 15
      worksheet.getColumn(2).width = 14
      worksheet.getColumn(3).width = 12
      worksheet.getColumn(4).width = 12
      // Ajuste solicitado: columnas E y F más anchas
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
      // No ajustar la columna 5 aquí; evita estrechar la columna E de PROGRAMADOS
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