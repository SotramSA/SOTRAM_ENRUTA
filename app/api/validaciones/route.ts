import { NextRequest, NextResponse } from 'next/server';
import { ValidacionService } from '@/src/lib/validacionService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Body recibido:', body);
    
    const { movilId, conductorId } = body;

    console.log('🔍 Valores extraídos:', { movilId, conductorId, tipoMovilId: typeof movilId, tipoConductorId: typeof conductorId });

    if (!movilId || !conductorId) {
      console.log('❌ Valores faltantes:', { movilId, conductorId });
      return NextResponse.json({
        success: false,
        error: 'Se requieren movilId y conductorId',
        received: { movilId, conductorId }
      }, { status: 400 });
    }

    console.log('🔍 Validando planillas y sanciones para:', { movilId, conductorId });

    const validacion = await ValidacionService.validarCompleta(movilId, conductorId);

    console.log('✅ Resultado de validación:', {
      tienePlanilla: validacion.tienePlanilla,
      sancionesAutomovil: validacion.sancionesAutomovil.length,
      sancionesConductor: validacion.sancionesConductor.length,
      tieneSanciones: validacion.tieneSanciones
    });

    return NextResponse.json({
      success: true,
      validacion
    });

  } catch (error) {
    console.error('❌ Error en validación:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al realizar las validaciones',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 