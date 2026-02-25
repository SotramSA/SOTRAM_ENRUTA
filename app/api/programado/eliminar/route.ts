import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha')

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    }

    const fechaObj = new Date(fecha)

    // Eliminar toda la programación para la fecha especificada
    const resultado = await prisma.programacion.deleteMany({
      where: {
        fecha: fechaObj
      }
    })

    return NextResponse.json({
      message: 'Programación eliminada exitosamente',
      eliminadas: resultado.count
    })

  } catch (error) {
    console.error('Error al eliminar programación:', error)
    return NextResponse.json({ error: 'Error al eliminar programación' }, { status: 500 })
  }
}

