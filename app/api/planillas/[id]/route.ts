import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam)

    // Verificar si la planilla existe
    const planilla = await prisma.planilla.findUnique({
      where: { id }
    })

    if (!planilla) {
      return NextResponse.json(
        { error: 'Planilla no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la planilla
    await prisma.planilla.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Planilla eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar planilla:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 