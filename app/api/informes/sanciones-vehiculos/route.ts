import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import ExcelJS from 'exceljs'

export async function POST(request: NextRequest) {
  try {
    // Obtener todas las sanciones de vehículos
    const sanciones = await prisma.sancionAutomovil.findMany({
      include: {
        automovil: {
          select: {
            movil: true,
            placa: true
          }
        }
      },
      orderBy: {
        fechaInicio: 'desc'
      }
    })

    // Crear el archivo Excel
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Sanciones de Vehículos')

    // Configurar columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Vehículo', key: 'vehiculo', width: 30 },
      { header: 'Placa', key: 'placa', width: 20 },
      { header: 'Motivo', key: 'motivo', width: 40 },
      { header: 'Fecha Inicio', key: 'fechaInicio', width: 20 },
      { header: 'Fecha Fin', key: 'fechaFin', width: 20 },
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
        vehiculo: 'No hay sanciones registradas',
        placa: 'N/A',
        motivo: 'No hay sanciones de vehículos en el sistema',
        fechaInicio: 'N/A',
        fechaFin: 'N/A',
        estado: 'N/A'
      })
    } else {
      sanciones.forEach(sancion => {
        const ahora = new Date();
        const fechaInicio = new Date(sancion.fechaInicio);
        const fechaFin = new Date(sancion.fechaFin);
        const estaActiva = ahora >= fechaInicio && ahora <= fechaFin;
        
        worksheet.addRow({
          id: sancion.id,
          vehiculo: sancion.automovil.movil,
          placa: sancion.automovil.placa,
          motivo: sancion.motivo,
          fechaInicio: fechaInicio.toLocaleDateString('es-CO', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }),
          fechaFin: fechaFin.toLocaleDateString('es-CO', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }),
          estado: estaActiva ? 'Activa' : 'Inactiva'
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
        'Content-Disposition': `attachment; filename="sanciones-vehiculos-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error al generar reporte de sanciones de vehículos:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte de sanciones de vehículos' },
      { status: 500 }
    )
  }
} 