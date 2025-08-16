import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function GET() {
  try {
    const rutas = await prisma.ruta.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json(rutas);
  } catch (error) {
    console.error('Error al obtener rutas activas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 