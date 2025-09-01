import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const configuracion = await prisma.configuracion.findFirst({
      where: { activo: true },
      orderBy: { id: 'desc' }
    });

    if (!configuracion) {
      // Devolver valores por defecto si no hay configuración activa
      const defaults = {
        id: 0,
        tiempoMinimoSalida: 5,
        tiempoMaximoTurno: 120,
        activo: false,
        // Configuración de impresora por defecto
        impresoraHabilitada: false,
        impresionDirecta: false,
        nombreImpresora: null,
      } as any;
      return NextResponse.json(defaults, { status: 200 });
    }

    // Parsear el valor JSON de la configuración
    const configuracionParsed = {
      id: configuracion.id,
      nombre: configuracion.nombre,
      activo: configuracion.activo,
      descripcion: configuracion.descripcion,
      fechaCreacion: configuracion.fechaCreacion,
      ...JSON.parse(configuracion.valor)
    };

    return NextResponse.json(configuracionParsed);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tiempoMinimoSalida,
      impresoraHabilitada,
      impresionDirecta
    } = body;

    // Validar datos
    if (typeof tiempoMinimoSalida !== 'number' || tiempoMinimoSalida < 1 || tiempoMinimoSalida > 60) {
      return NextResponse.json(
        { error: 'tiempoMinimoSalida debe ser un número entre 1 y 60' },
        { status: 400 }
      );
    }

    // Validar campos de impresora
    if (impresoraHabilitada !== undefined && typeof impresoraHabilitada !== 'boolean') {
      return NextResponse.json(
        { error: 'impresoraHabilitada debe ser un booleano' },
        { status: 400 }
      );
    }

    if (impresionDirecta !== undefined && typeof impresionDirecta !== 'boolean') {
      return NextResponse.json(
        { error: 'impresionDirecta debe ser un booleano' },
        { status: 400 }
      );
    }

    // Obtener configuración activa o crear una nueva
    const configuracionActual = await prisma.configuracion.findFirst({
      where: { activo: true }
    });

    let configuracionActualizada;

    if (!configuracionActual) {
      // Si no existe configuración activa, crear una nueva
      configuracionActualizada = await prisma.configuracion.create({
        data: {
          nombre: 'configuracion_principal',
          valor: JSON.stringify({
            tiempoMinimoSalida,
            impresoraHabilitada: impresoraHabilitada ?? false,
            impresionDirecta: impresionDirecta ?? false
          }),
          activo: true,
          descripcion: 'Configuración principal del sistema'
        }
      });
    } else {
      // Si existe, actualizarla
      const valorActual = JSON.parse(configuracionActual.valor);
      const nuevoValor = {
        ...valorActual,
        tiempoMinimoSalida,
        impresoraHabilitada: impresoraHabilitada ?? valorActual.impresoraHabilitada,
        impresionDirecta: impresionDirecta ?? valorActual.impresionDirecta
      };
      
      configuracionActualizada = await prisma.configuracion.update({
        where: { id: configuracionActual.id },
        data: {
          valor: JSON.stringify(nuevoValor)
        }
      });
    }

    return NextResponse.json(configuracionActualizada);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 