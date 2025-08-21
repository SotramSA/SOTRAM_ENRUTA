import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import ExcelJS from 'exceljs'

export async function POST(request: NextRequest) {
  try {
    // Obtener todos los vehículos con sus conductores asignados y propietario
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
        },
        automovilPropietario: {
          where: {
            activo: true
          },
          include: {
            propietario: {
              select: {
                nombre: true
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
      { header: 'Móvil', key: 'movil', width: 15 },
      { header: 'Placa', key: 'placa', width: 20 },
      { header: 'Propietario', key: 'propietario', width: 25 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Disponibilidad', key: 'disponibilidad', width: 15 },
      { header: 'SOAT', key: 'soat', width: 15 },
      { header: 'Revisión Tecnomecánica', key: 'revisionTecnomecanica', width: 20 },
      { header: 'Tarjeta de Operación', key: 'tarjetaOperacion', width: 20 },
      { header: 'Licencia de Tránsito', key: 'licenciaTransito', width: 20 },
      { header: 'Extintor', key: 'extintor', width: 15 },
      { header: 'Revisión Preventiva', key: 'revisionPreventiva', width: 20 },
      { header: 'Revisión Anual', key: 'revisionAnual', width: 20 },
      { header: 'Conductores Asignados', key: 'conductoresAsignados', width: 40 }
    ]

    // Estilo para el encabezado
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    }

    // Función para formatear fechas
    const formatearFecha = (fecha: Date | null | undefined) => {
      if (!fecha) return 'No registrada'
      try {
        return new Date(fecha).toLocaleDateString('es-ES')
      } catch {
        return 'Fecha inválida'
      }
    }

    // Agregar datos
    vehiculos.forEach(vehiculo => {
      const conductoresAsignados = vehiculo.conductorAutomovil
        .map(ca => `${ca.conductor.nombre} (${ca.conductor.cedula})`)
        .join(', ')

      // Obtener el propietario activo
      const propietarioActivo = vehiculo.automovilPropietario.find(ap => ap.activo)
      const nombrePropietario = propietarioActivo?.propietario?.nombre || 'No asignado'

      worksheet.addRow({
        movil: vehiculo.movil,
        placa: vehiculo.placa,
        propietario: nombrePropietario,
        estado: vehiculo.activo ? 'Activo' : 'Inactivo',
        disponibilidad: vehiculo.activo ? 'Disponible' : 'No disponible',
        soat: formatearFecha(vehiculo.soat),
        revisionTecnomecanica: formatearFecha(vehiculo.revisionTecnomecanica),
        tarjetaOperacion: formatearFecha(vehiculo.tarjetaOperacion),
        licenciaTransito: formatearFecha(vehiculo.licenciaTransito),
        extintor: formatearFecha(vehiculo.extintor),
        revisionPreventiva: formatearFecha(vehiculo.revisionPreventiva),
        revisionAnual: formatearFecha(vehiculo.revisionAnual),
        conductoresAsignados: conductoresAsignados || 'Sin asignar'
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