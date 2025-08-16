import { prisma } from '@/src/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha')

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    }

    // Normalizar a rango del día para evitar problemas de zona horaria
    const inicioDia = new Date(fecha)
    inicioDia.setHours(0, 0, 0, 0)
    const finDia = new Date(inicioDia)
    finDia.setDate(finDia.getDate() + 1)

    // Obtener todos los móviles activos y disponibles
    const todosLosMoviles = await prisma.automovil.findMany({
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

    // Obtener los móviles que ya están asignados en esta fecha (rango del día)
    const movilesAsignados = await prisma.programacion.findMany({
      where: {
        fecha: {
          gte: inicioDia,
          lt: finDia
        }
      },
      select: {
        movilId: true
      }
    })

    const movilesAsignadosIds = new Set(movilesAsignados.map(m => m.movilId))

    // Filtrar solo los móviles que no están asignados y siguen disponibles/activos
    const movilesDisponibles = todosLosMoviles.filter(movil => 
      !movilesAsignadosIds.has(movil.id)
    )

    return NextResponse.json({
      moviles: movilesDisponibles
    })

  } catch (error) {
    console.error('Error al obtener móviles disponibles:', error)
    return NextResponse.json({ error: 'Error al obtener móviles disponibles' }, { status: 500 })
  }
}

