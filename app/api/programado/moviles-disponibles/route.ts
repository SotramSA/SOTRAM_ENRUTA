import prismaWithRetry from '@/lib/prismaClient'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha')

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    }

    const fechaObj = new Date(fecha)
    const inicioDia = new Date(fechaObj)
    inicioDia.setHours(0, 0, 0, 0)
    const finDia = new Date(fechaObj)
    finDia.setHours(23, 59, 59, 999)

    console.log('🔍 Buscando móviles disponibles para fecha:', fecha)
    console.log('📅 Rango de fechas:', { inicioDia, finDia })


    
    // Obtener todos los móviles activos y disponibles
    const todosLosMoviles = await prismaWithRetry.automovil.findMany({
      where: {
        activo: true,
        disponible: true
      },
      select: {
        id: true,
        movil: true,
        placa: true
      },
      orderBy: {
        movil: 'asc'
      }
    })

    console.log('🚗 Total de móviles activos y disponibles:', todosLosMoviles.length)

    console.log(`🔍 Buscando móviles asignados para fecha: ${fecha}`)

    // Obtener los móviles que ya están asignados en esta fecha
    let movilesAsignadosIds = new Set<number>()
    
    try {
      const movilesAsignados = await prismaWithRetry.programacion.findMany({
        where: {
          fecha: fechaObj
        },
        select: {
          automovilId: true
        }
      })

      console.log('📋 Móviles asignados encontrados:', movilesAsignados.length)
      movilesAsignadosIds = new Set(movilesAsignados.map(m => m.automovilId).filter(id => id !== null) as number[])
    } catch (prismaError: any) {
      console.log('📝 No hay programaciones para esta fecha (primera vez o error):', prismaError.message)
      // Si no hay programaciones, todos los móviles están disponibles
      movilesAsignadosIds = new Set<number>()
    }

    console.log('📋 Móviles asignados para esta fecha (IDs): ', movilesAsignadosIds.size)

    // Filtrar solo los móviles que no están asignados y siguen disponibles/activos
    const movilesDisponibles = todosLosMoviles.filter(
      movil => !movilesAsignadosIds.has(movil.id)
    )

    console.log('📋 Móviles disponibles calculados:', movilesDisponibles.length)

    return NextResponse.json({
      success: true,
      movilesDisponibles: movilesDisponibles.map(m => ({
        id: m.id,
        movil: m.movil,
        placa: m.placa
      }))
    })

  } catch (error: any) {
    console.error('❌ Error al obtener móviles disponibles:', error)
    // Log Prisma specific error details if available
    if (error.code && error.clientVersion) {
      console.error('Prisma error:', {
        message: error.message,
        code: error.code,
        clientVersion: error.clientVersion
      })
    } else if (error.message.includes('Response from the Engine was empty')) {
      console.error('Detalles del error de Prisma: ', error.message)
    }
    return NextResponse.json(
      { error: 'Error al obtener móviles disponibles', details: error.message },
      { status: 500 }
    )
  } finally {
    await prismaWithRetry.$disconnect();
  }
}
