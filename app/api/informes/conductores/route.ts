import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import ExcelJS from 'exceljs'

export async function POST(request: NextRequest) {
  try {
    // Obtener todos los conductores con sus vehículos asignados
    const conductores = await prisma.conductor.findMany({
      include: {
        conductorAutomovil: {
          include: {
            automovil: {
              select: {
                movil: true,
                placa: true
              }
            }
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    // Crear el archivo Excel
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Lista de Conductores')

    // Configurar columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Cédula', key: 'cedula', width: 20 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Vehículos Asignados', key: 'vehiculos', width: 40 }
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
    conductores.forEach(conductor => {
      const vehiculosAsignados = conductor.conductorAutomovil
        .map(ca => `${ca.automovil.movil} (${ca.automovil.placa})`)
        .join(', ')

      worksheet.addRow({
        id: conductor.id,
        nombre: conductor.nombre,
        cedula: conductor.cedula,
        estado: conductor.activo ? 'Activo' : 'Inactivo',
        vehiculos: vehiculosAsignados || 'Sin asignar'
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
        'Content-Disposition': `attachment; filename="lista-conductores-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error al generar reporte de conductores:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte de conductores' },
      { status: 500 }
    )
  }
} 