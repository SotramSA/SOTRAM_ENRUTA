import { NextRequest, NextResponse } from 'next/server'
import prismaWithRetry from '@/lib/prismaClient'
import { isoToTimeHHMM } from '@/src/lib/utils'
import ExcelJS from 'exceljs'

/**
 * Informe Despachado con Rango de Fechas
 * POST /api/informes/despachado-rango
 * Body: { fechaInicio: 'YYYY-MM-DD', fechaFin: 'YYYY-MM-DD' }
 * Retorna un Excel (.xlsx) con filas combinadas de Turnos y Programados REALIZADOS,
 * columnas: Fecha, Id Viaje, No interno, Despacho, Conductor, Hora de salida.
 * - Turnos: Id Viaje prefijado con 'D'
 * - Programados realizados: Id Viaje prefijado con 'P', excluir si realizadoPorId es null
 * - Ordenado por fecha y hora de salida (HH:mm)
 */
export async function POST(request: NextRequest) {
  try {
    const { fechaInicio, fechaFin } = await request.json()

    console.log('Rango de fechas:', fechaInicio, 'a', fechaFin)

    // Validar formato de fechas
    if (!fechaInicio || typeof fechaInicio !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
      return NextResponse.json(
        { error: 'Fecha de inicio inválida: se requiere formato YYYY-MM-DD' },
        { status: 400 }
      )
    }

    if (!fechaFin || typeof fechaFin !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
      return NextResponse.json(
        { error: 'Fecha de fin inválida: se requiere formato YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Validar que fecha inicio sea menor o igual a fecha fin
    if (fechaInicio > fechaFin) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser menor o igual a la fecha de fin' },
        { status: 400 }
      )
    }

    // Convertir fechas de inicio
    const [yearInicio, monthInicio, dayInicio] = fechaInicio.split('-').map(Number)
    const fechaInicioDate = new Date(yearInicio, monthInicio - 1, dayInicio, 0, 0, 0, 0)

    // Convertir fechas de fin (incluir todo el día final)
    const [yearFin, monthFin, dayFin] = fechaFin.split('-').map(Number)
    const fechaFinExclusivo = new Date(yearFin, monthFin - 1, dayFin + 1, 0, 0, 0, 0)

    console.log("Inicio local:", fechaInicioDate)
    console.log("Fin local:", fechaFinExclusivo)

    // Obtener turnos del rango de fechas
    const turnos = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.turno.findMany({
        where: {
          fecha: { gte: fechaInicioDate, lt: fechaFinExclusivo }
        },
        include: { conductor: true, automovil: true, ruta: true },
        orderBy: [{ fecha: 'asc' }, { horaSalida: 'asc' }]
      })
    })

    // Obtener programados realizados del rango de fechas (excluir no realizados)
    const programadosRealizados = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.programacion.findMany({
        where: {
          fecha: { gte: fechaInicioDate, lt: fechaFinExclusivo },
          realizadoPorId: { not: null }
        },
        include: {
          automovil: true,
          ruta: true,
          realizadoPor: true,
          realizadoPorConductor: true
        },
        orderBy: [{ fecha: 'asc' }, { hora: 'asc' }]
      })
    })

    if (turnos.length === 0 && programadosRealizados.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron viajes despachados para el rango de fechas especificado' },
        { status: 404 }
      )
    }

    // Helpers de hora para ordenar/formatear
    const horaISOaMinutos = (iso: string): number => {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return -1
      return d.getUTCHours() * 60 + d.getUTCMinutes()
    }

    const formatearHoraProgramado = (hora: unknown): { hhmm: string; minutos: number } => {
      try {
        if (typeof hora === 'number') {
          const horas = Math.floor(hora / 100)
          const minutos = hora % 100
          return {
            hhmm: `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
            minutos: horas * 60 + minutos
          }
        }
        if (typeof hora === 'string') {
          // Caso HH:mm
          const m = hora.match(/^(\d{1,2}):(\d{2})$/)
          if (m) {
            const horas = parseInt(m[1], 10)
            const minutos = parseInt(m[2], 10)
            return {
              hhmm: `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
              minutos: horas * 60 + minutos
            }
          }
          // Caso "450" o "0930"
          if (/^\d{3,4}$/.test(hora)) {
            const normalized = hora.padStart(4, '0')
            const horas = parseInt(normalized.slice(0, 2), 10)
            const minutos = parseInt(normalized.slice(2, 4), 10)
            return {
              hhmm: `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
              minutos: horas * 60 + minutos
            }
          }
          // Caso ISO
          if (hora.includes('T')) {
            const hhmm = isoToTimeHHMM(hora)
            const partes = hhmm.split(':')
            const horas = parseInt(partes[0] || '0', 10)
            const minutos = parseInt(partes[1] || '0', 10)
            return { hhmm, minutos: horas * 60 + minutos }
          }
        }
      } catch (e) {
        // noop
      }
      return { hhmm: '', minutos: -1 }
    }

    // Función para formatear fecha
    const formatearFecha = (fecha: Date): string => {
      return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').reverse().join('-')
    }

    // Construir filas combinadas
    const filasTurnos = turnos.map(t => {
      const iso = t.horaSalida instanceof Date ? t.horaSalida.toISOString() : String(t.horaSalida)
      const fechaFormateada = formatearFecha(t.fecha)
      return {
        fecha: fechaFormateada,
        idViaje: `D${t.id}`,
        noInterno: t.automovil?.movil || '',
        despacho: t.ruta?.nombre || '',
        conductor: t.conductor?.nombre || '',
        horaSalida: isoToTimeHHMM(iso),
        minutosOrden: horaISOaMinutos(iso),
        fechaOrden: t.fecha.getTime()
      }
    })

    const filasProgramados = programadosRealizados
      .filter(p => !!p.realizadoPor) // asegurar móvil presente
      .map(p => {
        const { hhmm, minutos } = formatearHoraProgramado(p.hora as unknown)
        const fechaFormateada = formatearFecha(p.fecha)
        return {
          fecha: fechaFormateada,
          idViaje: `P${p.id}`,
          noInterno: p.realizadoPor?.movil || '',
          despacho: p.ruta?.nombre || '',
          conductor: p.realizadoPorConductor?.nombre || '',
          horaSalida: hhmm,
          minutosOrden: minutos,
          fechaOrden: p.fecha.getTime()
        }
      })

    // Unir y ordenar por fecha y hora de salida
    const filas = [...filasTurnos, ...filasProgramados]
      .filter(f => f.horaSalida && f.noInterno) // excluir programados sin móvil y filas sin hora
      .sort((a, b) => {
        // Primero por fecha, luego por hora
        if (a.fechaOrden !== b.fechaOrden) {
          return a.fechaOrden - b.fechaOrden
        }
        return a.minutosOrden - b.minutosOrden
      })

    // Calcular "No de Viaje" por móvil y fecha según su aparición en el reporte
    const contadorPorMovilYFecha = new Map<string, number>()
    const filasConNumero = filas.map(f => {
      const clave = `${f.noInterno}-${f.fecha}`
      const count = (contadorPorMovilYFecha.get(clave) || 0) + 1
      contadorPorMovilYFecha.set(clave, count)
      return { ...f, noDeViaje: count }
    })

    // Crear libro y hoja
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Despachado Rango')

    // Agregar título superior y congelar encabezado
    const titulo = `Informe Despachado - ${fechaInicio} al ${fechaFin}`
    worksheet.mergeCells('A1:G1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = titulo
    titleCell.font = { bold: true, size: 14 }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(1).height = 24
    // Congelar título y encabezados de la tabla (filas 1 y 2)
    worksheet.views = [{ state: 'frozen', ySplit: 2 }]

    // Crear tabla con estilo para facilitar filtros
    if (filasConNumero.length > 0) {
      worksheet.addTable({
        name: 'TablaDespachado',
        ref: 'A2',
        headerRow: true,
        columns: [
          { name: 'Fecha', filterButton: true },
          { name: 'Id Viaje', filterButton: true },
          { name: 'No interno', filterButton: true },
          { name: 'No de Viaje', filterButton: true },
          { name: 'Despacho', filterButton: true },
          { name: 'Conductor', filterButton: true },
          { name: 'Hora de salida', filterButton: true }
        ],
        rows: filasConNumero.map(f => [f.fecha, f.idViaje, f.noInterno, f.noDeViaje, f.despacho, f.conductor, f.horaSalida]),
        style: { theme: 'TableStyleMedium9', showRowStripes: true }
      })
    } else {
      // Sin datos: escribir encabezados como fila 2 para evitar errores de tabla
      const headers = ['Fecha', 'Id Viaje', 'No interno', 'No de Viaje', 'Despacho', 'Conductor', 'Hora de salida']
      const headerRow = worksheet.getRow(2)
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1)
        cell.value = h
        cell.font = { bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
          bottom: { style: 'thin' }
        }
      })
      headerRow.commit()
    }

    // Ajuste de anchos
    worksheet.getColumn(1).width = 12 // Fecha
    worksheet.getColumn(2).width = 14 // Id Viaje
    worksheet.getColumn(3).width = 12 // No interno
    worksheet.getColumn(4).width = 12 // No de Viaje
    worksheet.getColumn(5).width = 22 // Despacho
    worksheet.getColumn(6).width = 26 // Conductor
    worksheet.getColumn(7).width = 14 // Hora de salida

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="informe-despachado-${fechaInicio}-al-${fechaFin}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error generando informe despachado por rango:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}