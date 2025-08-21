import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import ExcelJS from 'exceljs'

export async function POST(request: NextRequest) {
  try {
    // Obtener todos los propietarios con sus vehículos asignados
    const propietarios = await prisma.propietario.findMany({
      include: {
        automovilPropietario: {
          where: {
            activo: true
          },
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
    const worksheet = workbook.addWorksheet('Lista de Propietarios')

    // Configurar columnas
    worksheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Cédula', key: 'cedula', width: 20 },
      { header: 'Teléfono', key: 'telefono', width: 20 },
      { header: 'Correo', key: 'correo', width: 30 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Automóviles', key: 'automoviles', width: 40 }
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
    propietarios.forEach(propietario => {
      const automovilesAsignados = propietario.automovilPropietario
        .map(ap => `${ap.automovil.movil} (${ap.automovil.placa})`)
        .join(', ')

      worksheet.addRow({
        nombre: propietario.nombre,
        cedula: propietario.cedula,
        telefono: propietario.telefono || 'No registrado',
        correo: propietario.correo || 'No registrado',
        observaciones: propietario.observaciones || 'Sin observaciones',
        estado: propietario.estado ? 'Activo' : 'Inactivo',
        automoviles: automovilesAsignados || 'Sin automóviles asignados'
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
        'Content-Disposition': `attachment; filename="lista-propietarios-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error al generar reporte de propietarios:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte de propietarios' },
      { status: 500 }
    )
  }
}
