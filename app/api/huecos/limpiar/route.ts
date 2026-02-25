import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 Iniciando limpieza de todos los huecos...');
    
    // Eliminar todos los huecos de la base de datos
    const resultado = await prisma.$executeRaw`
      DELETE FROM "HuecoDisponible"
    `;
    
    console.log('✅ Huecos eliminados exitosamente:', resultado, 'filas afectadas');
    
    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${resultado} huecos de la base de datos`,
      huecosEliminados: resultado
    });
    
  } catch (error) {
    console.error('❌ Error eliminando huecos:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al eliminar los huecos de la base de datos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 