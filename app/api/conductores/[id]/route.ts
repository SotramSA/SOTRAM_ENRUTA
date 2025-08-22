import { prisma } from '@/src/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID de conductor no válido' }, 
        { status: 400 }
      );
    }

    const { 
      nombre, 
      cedula, 
      telefono, 
      correo, 
      observaciones, 
      activo, 
      automoviles, 
      licenciaConduccion 
    } = await request.json();
    
    if (!nombre || !cedula) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: nombre y cédula son requeridos' }, 
        { status: 400 }
      );
    }

    // Validar que el conductor existe
    const conductorExistente = await prisma.conductor.findUnique({
      where: { id }
    });

    if (!conductorExistente) {
      return NextResponse.json(
        { error: 'Conductor no encontrado' }, 
        { status: 404 }
      );
    }

    // Actualizar conductor y sus relaciones con automóviles en una transacción
    const conductorActualizado = await prisma.$transaction(async (tx) => {
      try {
        // Actualizar conductor
        const conductor = await tx.conductor.update({
          where: { id },
          data: { 
            nombre, 
            cedula, 
            telefono: telefono || null,
            correo: correo || null,
            observaciones: observaciones || null,
            licenciaConduccion: licenciaConduccion ? new Date(licenciaConduccion) : null,
            activo: activo !== undefined ? activo : true,
          }
        });

        // Eliminar todas las relaciones existentes
        await tx.conductorAutomovil.deleteMany({
          where: { conductorId: id }
        });

        // Crear nuevas relaciones con automóviles si se proporcionan
        if (automoviles && automoviles.length > 0) {
          await tx.conductorAutomovil.createMany({
            data: automoviles.map((automovilId: number) => ({
              conductorId: id,
              automovilId,
              activo: true
            }))
          });
        }

        return conductor;
      } catch (error) {
        console.error('Error en la transacción:', error);
        throw error; // Re-lanzar el error para manejarlo en el catch externo
      }
    });
    
    return NextResponse.json(conductorActualizado);
  } catch (error) {
    console.error('Error al actualizar conductor:', error);
    
    return NextResponse.json({ 
      error: 'Error al actualizar conductor',
      details: error instanceof Error ? error.message : 'Error desconocido',
      ...(process.env.NODE_ENV === 'development' && {
        stack: error instanceof Error ? error.stack : undefined
      })
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    // Eliminar conductor y sus relaciones en una transacción
    await prisma.$transaction(async (tx) => {
      // Eliminar relaciones con automóviles
      await tx.conductorAutomovil.deleteMany({
        where: { conductorId: id }
      });

      // Eliminar conductor
      await tx.conductor.delete({
        where: { id }
      });
    });
    
    return NextResponse.json({ message: 'Conductor eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar conductor' }, { status: 500 });
  }
} 