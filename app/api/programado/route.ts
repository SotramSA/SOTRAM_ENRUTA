import { prisma } from '@/src/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha')

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    }

    const programaciones = await prisma.programacion.findMany({
      where: {
        fecha: new Date(fecha)
      },
      include: {
        movil: {
          select: {
            id: true,
            movil: true,
            placa: true
          }
        }
      },
      orderBy: [
        { hora: 'asc' },
        { ruta: 'asc' }
      ]
    })

    return NextResponse.json({
      programaciones: programaciones
    })
  } catch (error) {
    console.error('Error al obtener programaciones:', error)
    return NextResponse.json({ error: 'Error al obtener programaciones' }, { status: 500 })
  }
}
