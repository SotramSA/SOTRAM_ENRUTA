import { prisma } from '@/src/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { movilId, disponible } = await request.json()
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Obtener la programación actual
    const programacionActual = await prisma.programacion.findUnique({
      where: { id },
      include: {
        movil: true
      }
    })

    if (!programacionActual) {
      return NextResponse.json({ error: 'Programación no encontrada' }, { status: 404 })
    }

    const updateData: any = {}

    // Si se está cambiando el móvil
    if (movilId !== undefined && movilId !== programacionActual.movilId) {
      if (movilId === null || movilId === -1) {
        // Eliminar móvil (hacer disponible) - usar un valor especial (-1) para indicar sin móvil
        updateData.movilId = -1
        updateData.disponible = true
      } else {
        // Asignar nuevo móvil
        // Verificar que el nuevo móvil esté disponible y activo
        const nuevoMovil = await prisma.automovil.findFirst({
          where: {
            id: movilId,
            activo: true,
            disponible: true
          }
        })

        if (!nuevoMovil) {
          return NextResponse.json({ error: 'Móvil no disponible' }, { status: 400 })
        }

        // Verificar que el móvil no esté ya asignado a otra ruta en la misma fecha
        const movilOcupado = await prisma.programacion.findFirst({
          where: {
            movilId: movilId,
            fecha: programacionActual.fecha,
            id: { not: id },
            AND: {
              movilId: { not: -1 } // Excluir registros con movilId = -1
            }
          }
        })

        if (movilOcupado) {
          return NextResponse.json({ error: 'Móvil ya asignado a otra ruta en esta fecha' }, { status: 400 })
        }

        updateData.movilId = movilId
      }
    }

    // Si se está cambiando el estado disponible
    if (typeof disponible === 'boolean') {
      updateData.disponible = disponible
    }

    // Actualizar la programación
    const programacionActualizada = await prisma.programacion.update({
      where: { id },
      data: updateData,
      include: {
        movil: true
      }
    })

    return NextResponse.json({
      message: 'Programación actualizada exitosamente',
      programacion: programacionActualizada
    })

  } catch (error) {
    console.error('Error al actualizar programación:', error)
    return NextResponse.json({ error: 'Error al actualizar programación' }, { status: 500 })
  }
}

