import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
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
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Cédula', key: 'cedula', width: 20 },
      { header: 'Teléfono', key: 'telefono', width: 20 },
      { header: 'Correo', key: 'correo', width: 30 },
      { header: 'Licencia Conducción', key: 'licenciaConduccion', width: 20 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
      { header: 'Automóviles Asignados', key: 'automovilesAsignados', width: 40 },
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
    conductores.forEach(conductor => {
      const automovilesAsignados = conductor.conductorAutomovil
        .map(ca => `${ca.automovil.movil} (${ca.automovil.placa})`)
        .join(', ')

      // Formatear fecha de licencia de conducción
      let licenciaConduccionFormatted = 'No registrada'
      if (conductor.licenciaConduccion) {
        try {
          licenciaConduccionFormatted = new Date(conductor.licenciaConduccion).toLocaleDateString('es-ES')
        } catch {
          licenciaConduccionFormatted = 'Fecha inválida'
        }
      }

      worksheet.addRow({
        nombre: conductor.nombre,
        cedula: conductor.cedula,
        telefono: conductor.telefono || 'No registrado',
        correo: conductor.correo || 'No registrado',
        licenciaConduccion: licenciaConduccionFormatted,
        observaciones: conductor.observaciones || 'Sin observaciones',
        automovilesAsignados: automovilesAsignados || 'Sin asignar',
        estado: conductor.activo ? 'Activo' : 'Inactivo'
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