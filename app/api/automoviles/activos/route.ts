import { prisma } from '@/src/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 API /api/automoviles/activos - Iniciando consulta...');
    
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
    
    console.log(`✅ API /api/automoviles/activos - Consulta exitosa: ${automoviles.length} automóviles encontrados`);
    return NextResponse.json(automoviles);
  } catch (error) {
    console.error('❌ API /api/automoviles/activos - Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    return NextResponse.json({ 
      error: 'Error al obtener automóviles activos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}