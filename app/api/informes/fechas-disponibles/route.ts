import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Obtener todas las fechas únicas de turnos
    const turnos = await prisma.turno.findMany({
      select: {
        id: true,
        fecha: true,
        horaCreacion: true,
        horaSalida: true
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    // Agrupar por fecha
    const fechasUnicas = new Map()
    
    turnos.forEach(turno => {
      const fechaStr = turno.fecha.toISOString().split('T')[0] // YYYY-MM-DD
      if (!fechasUnicas.has(fechaStr)) {
        fechasUnicas.set(fechaStr, {
          fecha: fechaStr,
          turnos: []
        })
      }
      fechasUnicas.get(fechaStr).turnos.push({
        id: turno.id,
        fecha: turno.fecha,
        horaCreacion: turno.horaCreacion,
        horaSalida: turno.horaSalida
      })
    })

    const fechasDisponibles = Array.from(fechasUnicas.values())
      .sort((a, b) => b.fecha.localeCompare(a.fecha)) // Ordenar por fecha descendente

    return NextResponse.json({
      totalFechas: fechasDisponibles.length,
      fechasDisponibles: fechasDisponibles.map(fecha => ({
        fecha: fecha.fecha,
        cantidadTurnos: fecha.turnos.length,
        turnos: fecha.turnos.slice(0, 3) // Solo mostrar los primeros 3 turnos como ejemplo
      }))
    })

  } catch (error) {
    console.error('Error obteniendo fechas disponibles:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 