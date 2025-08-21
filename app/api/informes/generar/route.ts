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

    // Obtener también los turnos programados para la fecha especificada
    const turnosProgramados = await prisma.programacion.findMany({
      where: {
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      include: {
        movil: true
      },
      orderBy: [
        { hora: 'asc' }
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

    console.log(`Buscando turnos y programaciones para fecha: ${fecha}`)
    console.log(`Fecha inicio: ${fechaInicio.toISOString()}`)
    console.log(`Fecha fin: ${fechaFin.toISOString()}`)
    console.log(`Turnos encontrados: ${turnos.length}`)
    console.log(`Programaciones encontradas: ${turnosProgramados.length}`)
    
    // Mostrar información de los turnos encontrados para depuración
    if (turnos.length > 0) {
      console.log('Turnos encontrados:')
      turnos.forEach((turno, index) => {
        console.log(`${index + 1}. ID: ${turno.id}, Fecha: ${turno.fecha}, HoraCreacion: ${turno.horaCreacion}, Conductor: ${turno.conductor.nombre}`)
      })
    }

    if (turnosProgramados.length > 0) {
      console.log('Programaciones encontradas:')
      turnosProgramados.forEach((programado, index) => {
        console.log(`${index + 1}. ID: ${programado.id}, Fecha: ${programado.fecha}, Hora: "${programado.hora}" (tipo: ${typeof programado.hora}), Ruta: ${programado.ruta}, Móvil: ${programado.movil.movil}`)
      })
    }

    if (turnos.length === 0 && turnosProgramados.length === 0) {
      return NextResponse.json(
        { 
          error: 'No se encontraron turnos ni programaciones para la fecha especificada',
          fecha: fecha,
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString()
        },
        { status: 404 }
      )
    }

    // Función para normalizar nombres de rutas
    const normalizarNombreRuta = (nombre: string): string => {
      if (!nombre) return 'Sin Ruta'
      
      const nombreLower = nombre.toLowerCase().trim()
      
      // Casos especiales para Despacho D con rutas específicas
      if (nombreLower.includes('despacho d') && nombreLower.includes('ruta4')) {
        return 'Despacho D Ruta4'
      }
      if (nombreLower.includes('despacho d') && nombreLower.includes('ruta7')) {
        return 'Despacho D Ruta7'
      }
      
      // Casos específicos para los nombres exactos que vimos en los logs
      if (nombreLower.includes('despacho d') && nombreLower.includes('rut4')) {
        return 'Despacho D Ruta4'
      }
      if (nombreLower.includes('despacho d') && nombreLower.includes('rut7')) {
        return 'Despacho D Ruta7'
      }
      
      // Normalizar rutas que empiezan con "despacho"
      if (nombreLower.startsWith('despacho')) {
        // Extraer la letra después de "despacho"
        const match = nombreLower.match(/despacho\s*([a-z])/i)
        if (match) {
          return `Despacho ${match[1].toUpperCase()}`
        }
      }
      
      // Si es solo una letra (A, B, C, etc.), convertir a "Despacho X"
      if (/^[a-z]$/i.test(nombreLower)) {
        return `Despacho ${nombreLower.toUpperCase()}`
      }
      
      // Si contiene "RUT" seguido de un número, extraer solo la letra
      const rutMatch = nombreLower.match(/rut\s*([a-z])/i)
      if (rutMatch) {
        return `Despacho ${rutMatch[1].toUpperCase()}`
      }
      
      return nombre
    }

    // Agrupar turnos por ruta (incluyendo programados)
    const turnosPorRuta = turnos.reduce((acc, turno) => {
      const rutaNombre = normalizarNombreRuta(turno.ruta?.nombre || 'Sin Ruta')
      if (!acc[rutaNombre]) {
        acc[rutaNombre] = { turnos: [], programados: [] }
      }
      acc[rutaNombre].turnos.push(turno)
      return acc
    }, {} as Record<string, { turnos: typeof turnos, programados: any[] }>)

    // Agregar programados a las rutas correspondientes
    turnosProgramados.forEach(programado => {
      const rutaOriginal = programado.ruta || 'Sin Ruta'
      const rutaNombre = normalizarNombreRuta(rutaOriginal)
      console.log(`Ruta original: "${rutaOriginal}" -> Normalizada: "${rutaNombre}"`)
      
      if (!turnosPorRuta[rutaNombre]) {
        turnosPorRuta[rutaNombre] = { turnos: [], programados: [] }
      }
      turnosPorRuta[rutaNombre].programados.push(programado)
    })

    // Crear el libro de Excel
    const workbook = new ExcelJS.Workbook()

    // Para cada ruta, crear una hoja
    Object.entries(turnosPorRuta).forEach(([rutaNombre, datosRuta]) => {
      console.log(`Creando hoja: "${rutaNombre}" con ${datosRuta.turnos.length} turnos y ${datosRuta.programados.length} programados`)
      // Crear la hoja
      const worksheet = workbook.addWorksheet(rutaNombre)

      // Configurar columnas
      worksheet.columns = [
        { header: 'Tipo', key: 'tipo', width: 12 },
        { header: 'Hora Salida', key: 'horaSalida', width: 15 },
        { header: 'Móvil', key: 'movil', width: 12 },
        { header: 'Placa', key: 'placa', width: 15 },
        { header: 'Conductor', key: 'conductor', width: 30 }
      ]

      // Estilo para el encabezado
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
      }

      // Crear array con todos los datos para ordenar por hora de salida
      const todosLosDatos = []

      // Agregar datos de turnos
      datosRuta.turnos.forEach(turno => {
        const horaSalida = turno.horaSalida 
          ? new Date(turno.horaSalida).toLocaleTimeString('es-CO', { 
              timeZone: 'America/Bogota',
              hour: '2-digit', 
              minute: '2-digit'
            })
          : 'N/A'
        
        todosLosDatos.push({
          tipo: 'TURNO',
          horaSalida: horaSalida,
          movil: turno.movil.movil,
          placa: turno.movil.placa,
          conductor: turno.conductor.nombre,
          horaSalidaDate: turno.horaSalida ? new Date(turno.horaSalida) : new Date(0)
        })
      })

      // Agregar datos de programados
      datosRuta.programados.forEach(programado => {
        // Convertir la hora del programado y ajustar a hora colombiana
        let horaColombiana = 'N/A'
        let horaSalidaDate = new Date(0)
        
        if (programado.hora) {
          try {
            // La hora está en formato ISO completo, convertir a Date
            const fechaHora = new Date(programado.hora)
            
            // Verificar que la fecha sea válida
            if (!isNaN(fechaHora.getTime())) {
              // Convertir a hora colombiana usando toLocaleString
              horaColombiana = fechaHora.toLocaleTimeString('es-CO', {
                timeZone: 'America/Bogota',
                hour: '2-digit',
                minute: '2-digit'
              })
              horaSalidaDate = fechaHora
            }
          } catch (error) {
            console.error('Error procesando hora del programado:', programado.hora, error)
            horaColombiana = 'N/A'
          }
        }

        todosLosDatos.push({
          tipo: 'PROGRAMADO',
          horaSalida: horaColombiana,
          movil: programado.movil.movil,
          placa: programado.movil.placa,
          conductor: 'N/A',
          horaSalidaDate: horaSalidaDate
        })
      })

      // Ordenar por hora de salida
      todosLosDatos.sort((a, b) => a.horaSalidaDate.getTime() - b.horaSalidaDate.getTime())

      // Agregar filas ordenadas al Excel
      todosLosDatos.forEach(dato => {
        worksheet.addRow({
          tipo: dato.tipo,
          horaSalida: dato.horaSalida,
          movil: dato.movil,
          placa: dato.placa,
          conductor: dato.conductor
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