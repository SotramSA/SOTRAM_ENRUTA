import { prisma } from '@/src/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const automoviles = await prisma.automovil.findMany({
      where: {
        activo: true
      },
      orderBy: {
        movil: 'asc'
      },
      select: {
        id: true,
        movil: true,
        placa: true,
        activo: true
      }
    });
    
    return NextResponse.json(automoviles);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener automóviles activos' }, { status: 500 });
  }
} 