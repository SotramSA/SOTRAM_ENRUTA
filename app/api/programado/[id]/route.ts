import { prisma } from '@/src/lib/prisma'
import prismaWithRetry from '@/lib/prismaClient'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { movilId, disponible } = await request.json()
    const { id: idParam } = await params
    const id = parseInt(idParam)

    // Removed debug log of received data

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Obtener la programación actual
    const programacionActual = await prisma.programacion.findUnique({
      where: { id },
      include: {
        automovil: {
          select: {
            id: true,
            movil: true,
            placa: true
          }
        }
      }
    })

    if (!programacionActual) {
      return NextResponse.json({ error: 'Programación no encontrada' }, { status: 404 })
    }

    const updateData: any = {}

    // Si se está cambiando el móvil
    if (movilId !== undefined && movilId !== programacionActual.automovilId) {
      if (movilId === null || movilId === -1) {
        // Eliminar móvil (hacer disponible) - usar null para indicar sin móvil
        updateData.automovilId = null
      } else {
        // Asignar nuevo móvil
        // Verificar que el nuevo móvil esté disponible y activo
        const movil = await prismaWithRetry.automovil.findFirst({
          where: {
            id: movilId,
            activo: true,
            disponible: true,
            OR: [
              { colectivo: false },
              { colectivo: null }
            ]
          }
        })

        if (!movil) {
          return NextResponse.json({ error: 'Móvil no disponible' }, { status: 400 })
        }

        // Validación de móvil ya asignado removida para permitir asignaciones múltiples
        // El usuario puede asignar el mismo móvil a múltiples rutas sin restricciones

        updateData.automovilId = movilId
      }
    }

    // Si se está cambiando el estado disponible - campo removido del modelo
    // El estado disponible ahora se determina por si automovilId es null
    // if (typeof disponible === 'boolean') {
    //   updateData.disponible = disponible
    // }

    // Actualizar la programación
    const programacionActualizada = await prisma.programacion.update({
      where: { id },
      data: updateData,
      include: {
        automovil: {
          select: {
            id: true,
            movil: true,
            placa: true
          }
        }
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

