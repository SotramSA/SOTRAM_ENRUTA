import { NextRequest, NextResponse } from 'next/server'
import prismaWithRetry from '@/lib/prismaClient'
import { isoToTimeHHMM } from '@/src/lib/utils'
import ExcelJS from 'exceljs'

/**
 * Informe Despachado
 * POST /api/informes/despachado
 * Body: { fecha: 'YYYY-MM-DD' }
 * Retorna un Excel (.xlsx) con filas combinadas de Turnos y Programados REALIZADOS,
 * columnas: Id Viaje, No interno, Despacho, Conductor, Hora de salida.
 * - Turnos: Id Viaje prefijado con 'D'
 * - Programados realizados: Id Viaje prefijado con 'P', excluir si realizadoPorId es null
 * - Ordenado por hora de salida (HH:mm)
 */
export async function POST(request: NextRequest) {
  try {
    const { fecha } = await request.json()

    if (!fecha || typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json(
        { error: 'Fecha inválida: se requiere formato YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Interpretar fecha como límites UTC del día
    const [year, month, day] = fecha.split('-').map(Number)
    const fechaInicio = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    const fechaFinExclusivo = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))

    // Obtener turnos del día
    const turnos = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.turno.findMany({
        where: {
          fecha: { gte: fechaInicio, lt: fechaFinExclusivo }
        },
        include: { conductor: true, automovil: true, ruta: true },
        orderBy: [{ horaSalida: 'asc' }]
      })
    })

    // Obtener programados realizados del día (excluir no realizados)
    const programadosRealizados = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.programacion.findMany({
        where: {
          fecha: { gte: fechaInicio, lt: fechaFinExclusivo },
          realizadoPorId: { not: null }
        },
        include: {
          automovil: true,
          ruta: true,
          realizadoPor: true,
          realizadoPorConductor: true
        },
        orderBy: [{ hora: 'asc' }]
      })
    })

    if (turnos.length === 0 && programadosRealizados.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron viajes despachados para la fecha especificada' },
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

    // Construir filas combinadas
    const filasTurnos = turnos.map(t => {
      const iso = t.horaSalida instanceof Date ? t.horaSalida.toISOString() : String(t.horaSalida)
      return {
        idViaje: `D${t.id}`,
        noInterno: t.automovil?.movil || '',
        despacho: t.ruta?.nombre || '',
        conductor: t.conductor?.nombre || '',
        horaSalida: isoToTimeHHMM(iso),
        minutosOrden: horaISOaMinutos(iso)
      }
    })

    const filasProgramados = programadosRealizados
      .filter(p => !!p.realizadoPor) // asegurar móvil presente
      .map(p => {
        const { hhmm, minutos } = formatearHoraProgramado(p.hora as unknown)
        return {
          idViaje: `P${p.id}`,
          noInterno: p.realizadoPor?.movil || '',
          despacho: p.ruta?.nombre || '',
          conductor: p.realizadoPorConductor?.nombre || '',
          horaSalida: hhmm,
          minutosOrden: minutos
        }
      })

    // Unir y ordenar por hora de salida
    const filas = [...filasTurnos, ...filasProgramados]
      .filter(f => f.horaSalida && f.noInterno) // excluir programados sin móvil y filas sin hora
      .sort((a, b) => a.minutosOrden - b.minutosOrden)

    // Crear libro y hoja
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Despachado')

    // Agregar título superior y congelar encabezado
    const titulo = `Informe Despachado - ${fecha}`
    worksheet.mergeCells('A1:E1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = titulo
    titleCell.font = { bold: true, size: 14 }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(1).height = 24
    // Congelar título y encabezados de la tabla (filas 1 y 2)
    worksheet.views = [{ state: 'frozen', ySplit: 2 }]

    // Crear tabla con estilo para facilitar filtros
    if (filas.length > 0) {
      worksheet.addTable({
        name: 'TablaDespachado',
        ref: 'A2',
        headerRow: true,
        columns: [
          { name: 'Id Viaje', filterButton: true },
          { name: 'No interno', filterButton: true },
          { name: 'Despacho', filterButton: true },
          { name: 'Conductor', filterButton: true },
          { name: 'Hora de salida', filterButton: true }
        ],
        rows: filas.map(f => [f.idViaje, f.noInterno, f.despacho, f.conductor, f.horaSalida]),
        style: { theme: 'TableStyleMedium9', showRowStripes: true }
      })
    } else {
      // Sin datos: escribir encabezados como fila 2 para evitar errores de tabla
      const headers = ['Id Viaje', 'No interno', 'Despacho', 'Conductor', 'Hora de salida']
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

    // Nota: los filtros por columna vienen habilitados por la propia tabla

    // Ajuste de anchos
    worksheet.getColumn(1).width = 14
    worksheet.getColumn(2).width = 12
    worksheet.getColumn(3).width = 22
    worksheet.getColumn(4).width = 26
    worksheet.getColumn(5).width = 14

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="informe-despachado-${fecha}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error generando informe despachado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}