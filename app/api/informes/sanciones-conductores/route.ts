import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import ExcelJS from 'exceljs'

export async function POST(request: NextRequest) {
  try {
    // Obtener todas las sanciones de conductores
    const sanciones = await prisma.sancionConductor.findMany({
      include: {
        conductor: {
          select: {
            nombre: true,
            cedula: true
          }
        }
      },
      orderBy: {
        fechaInicio: 'desc'
      }
    })

    // Crear el archivo Excel
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Sanciones de Conductores')

    // Configurar columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Conductor', key: 'conductor', width: 30 },
      { header: 'Cédula', key: 'cedula', width: 20 },
      { header: 'Motivo', key: 'motivo', width: 40 },
      { header: 'Fecha Inicio', key: 'fechaInicio', width: 18 },
      { header: 'Fecha Fin', key: 'fechaFin', width: 18 },
      { header: 'Estado', key: 'estado', width: 15 }
    ]

    // Estilo para el encabezado
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    }

    // Agregar datos
    if (sanciones.length === 0) {
      // Si no hay sanciones, agregar una fila indicando que no hay datos
      worksheet.addRow({
        id: 'N/A',
        conductor: 'No hay sanciones registradas',
        cedula: 'N/A',
        motivo: 'No hay sanciones de conductores en el sistema',
        fechaInicio: 'N/A',
        fechaFin: 'N/A',
        estado: 'N/A'
      })
    } else {
      sanciones.forEach(sancion => {
        const fIni = sancion.fechaInicio ? new Date(sancion.fechaInicio) : null
        const fFin = sancion.fechaFin ? new Date(sancion.fechaFin) : null

        worksheet.addRow({
          id: sancion.id,
          conductor: sancion.conductor.nombre,
          cedula: sancion.conductor.cedula,
          motivo: sancion.descripcion,
          fechaInicio: fIni ? fIni.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A',
          fechaFin: fFin ? fFin.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A',
          estado: 'Registrada'
        })
      })
    }

    // Aplicar bordes a todas las celdas
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    })

    // Generar el archivo
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="sanciones-conductores-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error al generar reporte de sanciones de conductores:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte de sanciones de conductores' },
      { status: 500 }
    )
  }
} 