import { NextRequest, NextResponse } from 'next/server';
import { ValidacionService } from '@/src/lib/validacionService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Body recibido:', body);
    
    const { movilId, conductorId } = body;

    console.log('🔍 Valores extraídos:', { movilId, conductorId, tipoMovilId: typeof movilId, tipoConductorId: typeof conductorId });

    if (!movilId || !conductorId) {
      console.log('⚠️ Valores faltantes:', { movilId, conductorId });
      return NextResponse.json({
        success: false,
        message: 'Se requieren movilId y conductorId para la validación',
        received: { movilId, conductorId },
        validacion: {
          tienePlanilla: false,
          tieneListaChequeo: false,
          licenciaConduccionVencida: true,
          documentosVencidos: [],
          sancionesAutomovil: [],
          sancionesConductor: [],
          tieneSanciones: false
        }
      }, { status: 200 }); // Cambiado de 400 a 200 para mostrar mensaje en lugar de error
    }

    console.log('🔍 Validando planillas y sanciones para:', { movilId, conductorId });

    const validacion = await ValidacionService.validarCompleta(movilId, conductorId);

    console.log('✅ Resultado de validación:', {
      tienePlanilla: validacion.tienePlanilla,
      tieneListaChequeo: validacion.tieneListaChequeo,
      licenciaConduccionVencida: validacion.licenciaConduccionVencida,
      documentosVencidos: validacion.documentosVencidos.length,
      sancionesAutomovil: validacion.sancionesAutomovil.length,
      sancionesConductor: validacion.sancionesConductor.length,
      tieneSanciones: validacion.tieneSanciones
    });

    // Generar mensajes informativos basados en la validación
    const mensajes = [];
    
    if (!validacion.tienePlanilla) {
      mensajes.push('⚠️ No se encontró planilla para el día actual');
    }
    
    if (!validacion.tieneListaChequeo) {
      mensajes.push('⚠️ No se encontró lista de chequeo para el día actual');
    }
    
    if (validacion.licenciaConduccionVencida) {
      mensajes.push('⚠️ La licencia de conducción está vencida');
    }
    
    if (validacion.documentosVencidos.length > 0) {
      mensajes.push(`⚠️ ${validacion.documentosVencidos.length} documento(s) del móvil están vencidos`);
    }
    
    if (validacion.tieneSanciones) {
      mensajes.push(`⚠️ Hay ${validacion.sancionesAutomovil.length + validacion.sancionesConductor.length} sanción(es) activa(s)`);
    }

    return NextResponse.json({
      success: true,
      validacion,
      mensajes,
      resumen: {
        totalValidaciones: 5,
        validacionesExitosas: [
          validacion.tienePlanilla && 'Planilla',
          validacion.tieneListaChequeo && 'Lista de Chequeo',
          !validacion.licenciaConduccionVencida && 'Licencia de Conducción',
          validacion.documentosVencidos.length === 0 && 'Documentos del Móvil',
          !validacion.tieneSanciones && 'Sin Sanciones'
        ].filter(Boolean).length,
        validacionesFallidas: mensajes.length
      }
    });

  } catch (error) {
    console.error('❌ Error en validación:', error);
    
    // En lugar de devolver error 500, devolver una respuesta informativa
    return NextResponse.json({
      success: false,
      message: 'No se pudieron completar todas las validaciones',
      details: error instanceof Error ? error.message : 'Error desconocido',
      validacion: {
        tienePlanilla: false,
        tieneListaChequeo: false,
        licenciaConduccionVencida: true,
        documentosVencidos: [],
        sancionesAutomovil: [],
        sancionesConductor: [],
        tieneSanciones: false
      },
      mensajes: ['❌ Error al realizar las validaciones'],
      resumen: {
        totalValidaciones: 5,
        validacionesExitosas: 0,
        validacionesFallidas: 5
      }
    }, { status: 200 }); // Cambiado de 500 a 200
  }
} 