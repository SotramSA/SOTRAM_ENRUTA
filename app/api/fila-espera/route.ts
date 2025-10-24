import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/src/lib/session';
import { validateConductorIP } from '@/src/lib/ipMiddleware';



// GET - Obtener la fila de espera
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const filaEspera = await prisma.filaEspera.findMany({
      where: {
        estado: 'ESPERANDO'
      },
      orderBy: {
        fechaCreacion: 'asc'
      },
      include: {
        usuarioDespacho: {
          select: {
            nombre: true
          }
        }
      }
    });

    return NextResponse.json(filaEspera);
  } catch (error) {
    console.error('Error al obtener fila de espera:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Agregar conductor a la fila (solo desde IP autorizada)
export async function POST(request: NextRequest) {
  try {
    // Validar IP autorizada usando el middleware centralizado
    const ipValidation = validateConductorIP(request);
    
    if (!ipValidation.authorized) {
      console.log(`Intento de acceso desde IP no autorizada: ${ipValidation.ip}`);
      return NextResponse.json({ 
        error: ipValidation.error || 'Acceso no autorizado desde esta ubicación',
        ip: ipValidation.ip 
      }, { status: 403 });
    }

    const { numeroMovil, nombreConductor, observaciones } = await request.json();

    if (!numeroMovil || !nombreConductor) {
      return NextResponse.json({ 
        error: 'Número de móvil y nombre del conductor son requeridos' 
      }, { status: 400 });
    }

    // Verificar si el móvil ya está en la fila
    const existeEnFila = await prisma.filaEspera.findFirst({
      where: {
        numeroMovil,
        estado: 'ESPERANDO'
      }
    });

    if (existeEnFila) {
      return NextResponse.json({ 
        error: 'Este móvil ya está en la fila de espera' 
      }, { status: 400 });
    }

    const nuevoEnFila = await prisma.filaEspera.create({
      data: {
        numeroMovil,
        nombreConductor,
        observaciones,
        ipOrigen: ipValidation.ip
      }
    });

    // Notificar cambio en tiempo real - comentado temporalmente
    // FilaEventNotifier.conductorAgregado(nuevoEnFila);

    return NextResponse.json(nuevoEnFila, { status: 201 });
  } catch (error) {
    console.error('Error al agregar a fila de espera:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH - Despachar conductor (solo administradores)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id, accion, observaciones } = await request.json();

    if (!id || !accion) {
      return NextResponse.json({ 
        error: 'ID y acción son requeridos' 
      }, { status: 400 });
    }

    if (!['DESPACHADO', 'CANCELADO'].includes(accion)) {
      return NextResponse.json({ 
        error: 'Acción no válida' 
      }, { status: 400 });
    }

    const actualizado = await prisma.filaEspera.update({
      where: { id: parseInt(id) },
      data: {
        estado: accion,
        despachadoPor: parseInt(session.id),
        despachadoAt: new Date(),
        observaciones: observaciones || null
      },
      include: {
        usuarioDespacho: {
          select: {
            nombre: true
          }
        }
      }
    });

    // Notificar cambio en tiempo real - comentado temporalmente
    if (accion === 'DESPACHADO') {
      // FilaEventNotifier.conductorDespachado(actualizado);
    } else {
      // FilaEventNotifier.conductorCancelado(actualizado);
    }

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('Error al despachar conductor:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar entrada de la fila (solo administradores)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    await prisma.filaEspera.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ message: 'Entrada eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar entrada:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}