import { prisma } from '@/src/lib/prisma';
import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const { movil, placa, activo, disponible, colectivo, propietarios, conductores, soat, revisionTecnomecanica, tarjetaOperacion, licenciaTransito, extintor, revisionPreventiva } = await request.json();

    if (!movil || !placa) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Actualizar automóvil y sus relaciones con conductores en una transacción
    const automovilActualizado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Actualizar el automóvil
      const automovil = await tx.automovil.update({
        where: { id },
        data: { 
          movil, 
          placa, 
          activo: activo !== undefined ? activo : true,
          disponible: disponible !== undefined ? disponible : true,
          colectivo: colectivo !== undefined ? colectivo : null,
          soat: soat ? new Date(soat) : null,
          revisionTecnomecanica: revisionTecnomecanica ? new Date(revisionTecnomecanica) : null,
          tarjetaOperacion: tarjetaOperacion ? new Date(tarjetaOperacion) : null,
          licenciaTransito: licenciaTransito ? new Date(licenciaTransito) : null,
          extintor: extintor ? new Date(extintor) : null,
          revisionPreventiva: revisionPreventiva !== undefined ? Boolean(revisionPreventiva) : false,
        }
      });

      // Eliminar relaciones existentes con conductores
      await tx.conductorAutomovil.deleteMany({
        where: { automovilId: id }
      });

      // Eliminar relaciones existentes con propietarios
      await tx.automovilPropietario.deleteMany({
        where: { automovilId: id }
      });

      // Crear nuevas relaciones si se proporcionan
      if (conductores && conductores.length > 0) {
        await tx.conductorAutomovil.createMany({
          data: conductores.map((conductorId: number) => ({
            automovilId: id,
            conductorId,
            activo: true
          }))
        });
      }

      // Crear nuevas relaciones con propietarios si se proporcionan
      if (Array.isArray(propietarios) && propietarios.length > 0) {
        await tx.automovilPropietario.createMany({
          data: propietarios.map((propietarioId: number) => ({
            automovilId: id,
            propietarioId,
            activo: true,
          }))
        });
      }

      return automovil;
    });

    return NextResponse.json(automovilActualizado);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar automóvil' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    // Eliminar automóvil y sus relaciones en una transacción
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Eliminar relaciones con conductores
      await tx.conductorAutomovil.deleteMany({
        where: { automovilId: id }
      });

      // Eliminar relaciones con propietarios
      await tx.automovilPropietario.deleteMany({
        where: { automovilId: id }
      });

      // Eliminar el automóvil
      await tx.automovil.delete({
        where: { id }
      });
    });

    return NextResponse.json({ message: 'Automóvil eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar automóvil' }, { status: 500 });
  }
}