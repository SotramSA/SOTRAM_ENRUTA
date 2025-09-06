import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const automovilId = parseInt(id);

    if (isNaN(automovilId)) {
      return NextResponse.json({ error: 'ID de automóvil inválido' }, { status: 400 });
    }

    // Obtener conductores activos asociados al automóvil
    const conductorAutomovil = await prisma.conductorAutomovil.findMany({
      where: {
        automovilId: automovilId,
        activo: true,
        conductor: {
          activo: true
        }
      },
      include: {
        conductor: {
          select: {
            id: true,
            nombre: true,
            cedula: true
          }
        }
      }
    });

    const conductores = conductorAutomovil.map(ca => ca.conductor);

    return NextResponse.json({
      conductores,
      automovilId
    });

  } catch (error) {
    console.error('Error al obtener conductores del automóvil:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
