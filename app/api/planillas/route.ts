import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { formatDateToYYYYMMDDLocal } from '@/src/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const automovilId = searchParams.get('automovilId')
    const año = searchParams.get('año')
    const mes = searchParams.get('mes')

    if (!automovilId || !año || !mes) {
      return NextResponse.json(
        { error: 'Se requieren automovilId, año y mes' },
        { status: 400 }
      )
    }

    // Construir el rango de fechas para el mes de manera más eficiente
    const fechaInicio = new Date(parseInt(año), parseInt(mes) - 1, 1)
    const fechaFin = new Date(parseInt(año), parseInt(mes), 0, 23, 59, 59)

    const planillas = await prisma.planilla.findMany({
      where: {
        movilId: parseInt(automovilId),
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        },
        activo: true // Solo planillas activas
      },
      select: {
        id: true,
        fecha: true,
        movilId: true
      },
      orderBy: {
        fecha: 'asc'
      }
    })

    return NextResponse.json({
      planillas: planillas.map(p => ({
        ...p,
        fecha: p.fecha.toISOString().slice(0, 10)
      }))
    })
  } catch (error) {
    console.error('Error al obtener planillas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { automovilId, fechas } = body

    if (!automovilId || !fechas || !Array.isArray(fechas)) {
      return NextResponse.json(
        { error: 'Se requieren automovilId y fechas' },
        { status: 400 }
      )
    }

    // Verificar que el automóvil existe
    const automovil = await prisma.automovil.findUnique({
      where: { id: automovilId }
    })

    if (!automovil) {
      return NextResponse.json(
        { error: 'Automóvil no encontrado' },
        { status: 404 }
      )
    }

    // Crear las planillas en lote
    const planillasCreadas = await prisma.planilla.createMany({
      data: fechas.map((fecha: string) => ({
        movilId: automovilId,
        fecha: new Date(fecha + 'T00:00:00') // Forzar hora local para evitar desfase
      })),
      skipDuplicates: true // Evitar duplicados
    })

    return NextResponse.json({
      message: `${planillasCreadas.count} planilla(s) creada(s) correctamente`,
      count: planillasCreadas.count
    }, { status: 201 })
  } catch (error) {
    console.error('Error al crear planillas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 