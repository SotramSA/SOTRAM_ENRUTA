import { prisma } from '@/src/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const conductores = await prisma.conductor.findMany({
      where: {
        activo: true
      },
      orderBy: {
        nombre: 'asc'
      },
      select: {
        id: true,
        nombre: true,
        cedula: true,
        activo: true
      }
    });
    
    return NextResponse.json({ conductores });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener conductores activos' }, { status: 500 });
  }
} 