import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import ExcelJS from 'exceljs'

export async function POST(request: NextRequest) {
  try {
    const { fecha } = await request.json()

    if (!fecha) {
      return NextResponse.json(
        { error: 'Fecha es requerida' },
        { status: 400 }
      )
    }

    // Convertir la fecha a objetos Date para el inicio y fin del día
    const fechaInicio = new Date(fecha)
    fechaInicio.setHours(0, 0, 0, 0)
    
    const fechaFin = new Date(fecha)
    fechaFin.setHours(23, 59, 59, 999)

    // Obtener todos los turnos de la fecha especificada
    // Primero intentar por fecha, luego por horaCreacion
    let turnos = await prisma.turno.findMany({
      where: {
        OR: [
          {
            fecha: {
              gte: fechaInicio,
              lte: fechaFin
            }
          },
          {
            horaCreacion: {
              gte: fechaInicio,
              lte: fechaFin
            }
          }
        ]
      },
      include: {
        conductor: true,
        movil: true,
        ruta: true
      },
      orderBy: [
        { rutaId: 'asc' },
        { horaCreacion: 'asc' }
      ]
    })

    // Si no se encuentran turnos, buscar por cualquier fecha que contenga la fecha seleccionada
    if (turnos.length === 0) {
      console.log('No se encontraron turnos con filtro estricto, buscando con filtro más amplio...')
      
      // Buscar turnos que tengan la fecha en cualquier campo de fecha
      turnos = await prisma.turno.findMany({
        where: {
          OR: [
            {
              fecha: {
                gte: new Date(fecha + 'T00:00:00.000Z'),
                lte: new Date(fecha + 'T23:59:59.999Z')
              }
            },
            {
              horaCreacion: {
                gte: new Date(fecha + 'T00:00:00.000Z'),
                lte: new Date(fecha + 'T23:59:59.999Z')
              }
            },
            {
              horaSalida: {
                gte: new Date(fecha + 'T00:00:00.000Z'),
                lte: new Date(fecha + 'T23:59:59.999Z')
              }
            }
          ]
        },
        include: {
          conductor: true,
          movil: true,
          ruta: true
        },
        orderBy: [
          { rutaId: 'asc' },
          { horaCreacion: 'asc' }
        ]
      })
    }

    console.log(`Buscando turnos para fecha: ${fecha}`)
    console.log(`Fecha inicio: ${fechaInicio.toISOString()}`)
    console.log(`Fecha fin: ${fechaFin.toISOString()}`)
    console.log(`Turnos encontrados: ${turnos.length}`)
    
    // Mostrar información de los turnos encontrados para depuración
    if (turnos.length > 0) {
      console.log('Turnos encontrados:')
      turnos.forEach((turno, index) => {
        console.log(`${index + 1}. ID: ${turno.id}, Fecha: ${turno.fecha}, HoraCreacion: ${turno.horaCreacion}, Conductor: ${turno.conductor.nombre}`)
      })
    }

    if (turnos.length === 0) {
      return NextResponse.json(
        { 
          error: 'No se encontraron turnos para la fecha especificada',
          fecha: fecha,
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString()
        },
        { status: 404 }
      )
    }

    // Agrupar turnos por ruta
    const turnosPorRuta = turnos.reduce((acc, turno) => {
      const rutaNombre = turno.ruta?.nombre || 'Sin Ruta'
      if (!acc[rutaNombre]) {
        acc[rutaNombre] = []
      }
      acc[rutaNombre].push(turno)
      return acc
    }, {} as Record<string, typeof turnos>)

    // Crear el libro de Excel
    const workbook = new ExcelJS.Workbook()

    // Para cada ruta, crear una hoja
    Object.entries(turnosPorRuta).forEach(([rutaNombre, turnosRuta]) => {
      // Crear la hoja
      const worksheet = workbook.addWorksheet(rutaNombre)

      // Configurar columnas
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Hora Solicitud', key: 'horaSolicitud', width: 15 },
        { header: 'Hora Salida', key: 'horaSalida', width: 15 },
        { header: 'Móvil', key: 'movil', width: 12 },
        { header: 'Placa', key: 'placa', width: 15 },
        { header: 'Conductor', key: 'conductor', width: 30 },
        { header: 'Cédula', key: 'cedula', width: 20 },
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
      turnosRuta.forEach(turno => {
        worksheet.addRow({
          id: turno.id,
          horaSolicitud: turno.horaCreacion 
            ? new Date(turno.horaCreacion).toLocaleTimeString('es-CO', { 
                timeZone: 'America/Bogota',
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })
            : 'N/A',
          horaSalida: turno.horaSalida 
            ? new Date(turno.horaSalida).toLocaleTimeString('es-CO', { 
                timeZone: 'America/Bogota',
                hour: '2-digit', 
                minute: '2-digit'
              })
            : 'N/A',
          movil: turno.movil.movil,
          placa: turno.movil.placa,
          conductor: turno.conductor.nombre,
          cedula: turno.conductor.cedula,
          estado: turno.estado || 'PENDIENTE'
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
    })

    // Generar el archivo
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="informe-turnos-${fecha}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Error generando informe:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 