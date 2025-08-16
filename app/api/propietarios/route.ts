import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const propietarios = await prisma.propietario.findMany({
      include: {
        automovilPropietario: {
          where: { activo: true },
          include: {
            automovil: {
              select: {
                id: true,
                movil: true,
                placa: true,
                activo: true,
              }
            }
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    // Transformar los datos para que el frontend reciba el formato esperado
    const propietariosTransformados = propietarios.map(propietario => ({
      ...propietario,
      automoviles: propietario.automovilPropietario
        .filter(ap => ap.activo && ap.automovil.activo)
        .map(ap => ap.automovil)
    }))

    return NextResponse.json(propietariosTransformados)
  } catch (error) {
    console.error('Error fetching propietarios:', error)
    return NextResponse.json(
      { error: 'Error al obtener propietarios' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, cedula, telefono, correo, observaciones, estado, automoviles } = body

    // Validar campos requeridos
    if (!nombre || !cedula) {
      return NextResponse.json(
        { error: 'Nombre y cédula son requeridos' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un propietario con esa cédula
    const existingPropietario = await prisma.propietario.findFirst({
      where: { cedula }
    })

    if (existingPropietario) {
      return NextResponse.json(
        { error: 'Ya existe un propietario con esa cédula' },
        { status: 400 }
      )
    }

    // Crear propietario y sus relaciones con automóviles en una transacción (muchos a muchos)
    const nuevoPropietario = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const propietario = await tx.propietario.create({
        data: {
          nombre,
          cedula,
          telefono: telefono || null,
          correo: correo || null,
          observaciones: observaciones || null,
          estado: estado !== undefined ? estado : true
        }
      });

      // Crear relaciones en la tabla puente si se proporcionan automóviles
      if (Array.isArray(automoviles) && automoviles.length > 0) {
        await tx.automovilPropietario.createMany({
          data: automoviles.map((automovilId: number) => ({
            automovilId,
            propietarioId: propietario.id,
            activo: true,
          }))
        })
      }

      return propietario;
    });

    // Obtener el propietario creado con sus automóviles (vía tabla puente)
    const propietarioConAutomoviles = await prisma.propietario.findUnique({
      where: { id: nuevoPropietario.id },
      include: {
        automovilPropietario: {
          where: { activo: true },
          include: {
            automovil: {
              select: {
                id: true,
                movil: true,
                placa: true,
                activo: true,
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

    return NextResponse.json(propietarioTransformado, { status: 201 })
  } catch (error) {
    console.error('Error creating propietario:', error)
    return NextResponse.json(
      { error: 'Error al crear propietario' },
      { status: 500 }
    )
  }
}
