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
        fecha: 'desc'
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
      { header: 'Tipo de Sanción', key: 'tipo', width: 25 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Fecha de Registro', key: 'fechaRegistro', width: 20 }
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
        tipo: 'N/A',
        descripcion: 'No hay sanciones de vehículos en el sistema',
        fecha: 'N/A',
        estado: 'N/A',
        fechaRegistro: 'N/A'
      })
    } else {
      sanciones.forEach(sancion => {
        worksheet.addRow({
          id: sancion.id,
          vehiculo: sancion.automovil.movil,
          placa: sancion.automovil.placa,
          tipo: sancion.tipo,
          descripcion: sancion.descripcion,
          fecha: sancion.fecha ? 
            new Date(sancion.fecha).toLocaleDateString('es-CO', {
              timeZone: 'America/Bogota',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }) : 'N/A',
          estado: sancion.activa ? 'Activa' : 'Inactiva',
          fechaRegistro: sancion.createdAt ? 
            new Date(sancion.createdAt).toLocaleDateString('es-CO', {
              timeZone: 'America/Bogota',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }) : 'N/A'
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