import { NextRequest, NextResponse } from 'next/server'
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

    const origin = new URL(request.url).origin
    const fechas: string[] = []
    {
      const inicio = new Date(`${fechaInicio}T00:00:00Z`)
      const fin = new Date(`${fechaFin}T00:00:00Z`)
      const startMs = Math.min(inicio.getTime(), fin.getTime())
      const endMs = Math.max(inicio.getTime(), fin.getTime())
      const dayMs = 24 * 60 * 60 * 1000
      for (let t = startMs; t <= endMs; t += dayMs) {
        const d = new Date(t)
        const y = d.getUTCFullYear()
        const m = String(d.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(d.getUTCDate()).padStart(2, '0')
        fechas.push(`${y}-${m}-${dd}`)
      }
    }
    const filasConNumero: Array<[string, string | number, string | number, number | string, string | number, string | number, string | number]> = []
    for (const f of fechas) {
      const resp = await fetch(`${origin}/api/informes/despachado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: f })
      })
      if (!resp.ok) {
        continue
      }
      const ab = await resp.arrayBuffer()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(Buffer.from(ab) as any)
      const ws = wb.worksheets[0]
      const startRow = 3
      for (let r = startRow; r <= ws.rowCount; r++) {
        const row = ws.getRow(r)
        const idViaje = row.getCell(1).value
        const noInterno = row.getCell(2).value
        const noDeViaje = row.getCell(3).value
        const despacho = row.getCell(4).value
        const conductor = row.getCell(5).value
        const horaSalida = row.getCell(6).value
        if (!idViaje || !noInterno || !horaSalida) {
          continue
        }
        filasConNumero.push([f, idViaje as any, noInterno as any, noDeViaje as any, despacho as any, conductor as any, horaSalida as any])
      }
    }
    if (filasConNumero.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron viajes despachados para el rango de fechas especificado' },
        { status: 404 }
      )
    }

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
      rows: filasConNumero,
      style: { theme: 'TableStyleMedium9', showRowStripes: true }
    })

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
