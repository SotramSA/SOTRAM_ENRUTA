import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

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

    return NextResponse.json(configuracion);
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
          tiempoMinimoSalida,
          impresoraHabilitada: impresoraHabilitada ?? false,
          impresionDirecta: impresionDirecta ?? false,
          activo: true,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        }
      });
    } else {
      // Si existe, actualizarla
      configuracionActualizada = await prisma.configuracion.update({
        where: { id: configuracionActual.id },
        data: {
          tiempoMinimoSalida,
          impresoraHabilitada,
          impresionDirecta,
          fechaActualizacion: new Date()
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