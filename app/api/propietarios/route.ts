import { NextRequest, NextResponse } from 'next/server'
import prismaWithRetry from '@/lib/prismaClient'
import type { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const propietarios = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.propietario.findMany({
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
      });
    });

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
  } finally {
    await prismaWithRetry.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, cedula, telefono, correo, observaciones, estado, automoviles, esConductor, licenciaConduccion } = body

    // Validar campos requeridos
    if (!nombre || !cedula) {
      return NextResponse.json(
        { error: 'Nombre y cédula son requeridos' },
        { status: 400 }
      )
    }

    // Si es conductor, validar que tenga licencia de conducción
    if (esConductor && !licenciaConduccion) {
      return NextResponse.json(
        { error: 'La fecha de vencimiento de licencia de conducción es requerida cuando el propietario también es conductor' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un propietario con esa cédula
    const existingPropietario = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.propietario.findFirst({
        where: { cedula }
      });
    });

    if (existingPropietario) {
      return NextResponse.json(
        { error: 'Ya existe un propietario con esa cédula' },
        { status: 400 }
      )
    }

    // Si es conductor, verificar si ya existe un conductor con esa cédula
    if (esConductor) {
      const existingConductor = await prismaWithRetry.executeWithRetry(async () => {
        return await prismaWithRetry.conductor.findFirst({
          where: { cedula }
        });
      });

      if (existingConductor) {
        return NextResponse.json(
          { error: 'Ya existe un conductor con esa cédula' },
          { status: 400 }
        )
      }
    }

    // Crear propietario, conductor (si aplica) y sus relaciones en una transacción
    const nuevoPropietario = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.$transaction(async (tx: Prisma.TransactionClient) => {
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

        // Si es conductor, crear también el conductor
        if (esConductor) {
          const conductor = await tx.conductor.create({
            data: {
              nombre,
              cedula,
              telefono: telefono || null,
              correo: correo || null,
              observaciones: observaciones || null,
              licenciaConduccion: licenciaConduccion ? new Date(licenciaConduccion) : null,
              activo: estado !== undefined ? estado : true
            }
          });

          // Si hay automóviles asignados, crear las relaciones conductor-automóvil
          if (Array.isArray(automoviles) && automoviles.length > 0) {
            await tx.conductorAutomovil.createMany({
              data: automoviles.map((automovilId: number) => ({
                automovilId,
                conductorId: conductor.id,
                activo: true,
              }))
            });
          }
        }

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
    });

    // Obtener el propietario creado con sus automóviles (vía tabla puente)
    const propietarioConAutomoviles = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.propietario.findUnique({
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
  } finally {
    await prismaWithRetry.$disconnect();
  }
}
