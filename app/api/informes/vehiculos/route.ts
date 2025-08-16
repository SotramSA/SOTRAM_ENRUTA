import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import ExcelJS from 'exceljs'

export async function POST(request: NextRequest) {
  try {
    // Obtener todos los vehículos con sus conductores asignados
    const vehiculos = await prisma.automovil.findMany({
      include: {
        conductorAutomovil: {
          include: {
            conductor: {
              select: {
                nombre: true,
                cedula: true
              }
            }
          }
        }
      },
      orderBy: {
        movil: 'asc'
      }
    })

    // Crear el archivo Excel
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Lista de Vehículos')

    // Configurar columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Móvil', key: 'movil', width: 15 },
      { header: 'Placa', key: 'placa', width: 20 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Conductores Asignados', key: 'conductores', width: 40 }
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
    vehiculos.forEach(vehiculo => {
      const conductoresAsignados = vehiculo.conductorAutomovil
        .map(ca => `${ca.conductor.nombre} (${ca.conductor.cedula})`)
        .join(', ')

      worksheet.addRow({
        id: vehiculo.id,
        movil: vehiculo.movil,
        placa: vehiculo.placa,
        estado: vehiculo.activo ? 'Activo' : 'Inactivo',
        conductores: conductoresAsignados || 'Sin asignar'
      })
    })

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
        'Content-Disposition': `attachment; filename="lista-vehiculos-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error al generar reporte de vehículos:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte de vehículos' },
      { status: 500 }
    )
  }
} 