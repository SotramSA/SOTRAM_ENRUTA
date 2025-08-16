import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Obtener algunos turnos de ejemplo
    const turnos = await prisma.turno.findMany({
      take: 10,
      include: {
        conductor: true,
        movil: true,
        ruta: true
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    // Obtener estadísticas básicas
    const totalTurnos = await prisma.turno.count()
    const turnosHoy = await prisma.turno.count({
      where: {
        fecha: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    })

    return NextResponse.json({
      totalTurnos,
      turnosHoy,
      ultimosTurnos: turnos.map(turno => ({
        id: turno.id,
        fecha: turno.fecha,
        horaCreacion: turno.horaCreacion,
        horaSalida: turno.horaSalida,
        conductor: turno.conductor.nombre,
        movil: turno.movil.movil,
        ruta: turno.ruta?.nombre || 'Sin Ruta',
        estado: turno.estado
      }))
    })

  } catch (error) {
    console.error('Error en test endpoint:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 