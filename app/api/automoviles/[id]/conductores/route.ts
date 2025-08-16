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
      return NextResponse.json(
        { error: 'ID de automóvil inválido' },
        { status: 400 }
      );
    }

    const conductores = await prisma.conductorAutomovil.findMany({
      where: {
        automovilId: automovilId,
        activo: true
      },
      include: {
        conductor: true
      }
    });

    const conductoresFormateados = conductores
      .map(ca => ca.conductor)
      .filter(conductor => conductor !== null && conductor.activo);

    return NextResponse.json(conductoresFormateados);
  } catch (error) {
    console.error('Error al obtener conductores del automóvil:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 