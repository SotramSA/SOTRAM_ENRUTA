import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nombre, cedula, telefono, correo, observaciones, estado, automoviles } = body

    // Validar campos requeridos
    if (!nombre || !cedula) {
      return NextResponse.json(
        { error: 'Nombre y cédula son requeridos' },
        { status: 400 }
      )
    }

    // Verificar si ya existe otro propietario con esa cédula
    const existingPropietario = await prisma.propietario.findFirst({
      where: {
        cedula,
        id: { not: parseInt(id) }
      }
    })

    if (existingPropietario) {
      return NextResponse.json(
        { error: 'Ya existe otro propietario con esa cédula' },
        { status: 400 }
      )
    }

    // Actualizar propietario y sus relaciones con automóviles en una transacción
    const propietarioActualizado = await prisma.$transaction(async (tx) => {
      // Actualizar datos del propietario
      const propietario = await tx.propietario.update({
        where: { id: parseInt(id) },
        data: {
          nombre,
          cedula,
          telefono: telefono || null,
          correo: correo || null,
          observaciones: observaciones || null,
          estado: estado !== undefined ? estado : true
        }
      });

      // Primero, eliminar todas las relaciones actuales de este propietario con automóviles
      await tx.automovilPropietario.deleteMany({
        where: { propietarioId: parseInt(id) }
      });

      // Luego, asignar los nuevos automóviles al propietario
      if (automoviles && automoviles.length > 0) {
        // Crear nuevas relaciones en la tabla puente AutomovilPropietario
        await tx.automovilPropietario.createMany({
          data: automoviles.map((automovilId: number) => ({
            automovilId,
            propietarioId: parseInt(id),
            activo: true
          })),
          skipDuplicates: true
        });
      }

      return propietario;
    });

    // Obtener el propietario actualizado con sus automóviles
    const propietarioConAutomoviles = await prisma.propietario.findUnique({
      where: { id: parseInt(id) },
      include: {
        automovilPropietario: {
          where: { activo: true },
          include: {
            automovil: {
              select: {
                id: true,
                movil: true,
                placa: true,
                activo: true
              }
            }
          }
        }
      }
    });

    // Transformar los datos para que el frontend reciba el formato esperado
    const propietarioTransformado = {
      ...propietarioConAutomoviles,
      automoviles: propietarioConAutomoviles?.automovilPropietario
        .filter(ap => ap.activo && ap.automovil.activo)
        .map(ap => ap.automovil) || []
    };

    return NextResponse.json(propietarioTransformado)
  } catch (error) {
    console.error('Error updating propietario:', error)
    return NextResponse.json(
      { error: 'Error al actualizar propietario' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar si el propietario tiene automóviles asignados
    const automovilesAsignados = await prisma.automovilPropietario.findMany({
      where: { propietarioId: parseInt(id), activo: true }
    })

    if (automovilesAsignados.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un propietario que tiene automóviles asignados' },
        { status: 400 }
      )
    }

    await prisma.propietario.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ message: 'Propietario eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting propietario:', error)
    return NextResponse.json(
      { error: 'Error al eliminar propietario' },
      { status: 500 }
    )
  }
}
