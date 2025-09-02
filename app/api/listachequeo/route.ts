import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { numeroMovil, nombreInspector } = body;

    if (!numeroMovil || !nombreInspector) {
      return NextResponse.json(
        { error: 'Número de móvil y nombre del inspector son requeridos' },
        { status: 400 }
      );
    }

    // Buscar el automóvil por número de móvil
    const automovil = await prisma.automovil.findFirst({
      where: {
        movil: numeroMovil,
        activo: true
      }
    });

    if (!automovil) {
      return NextResponse.json(
        { error: 'No se encontró el móvil en la base de datos' },
        { status: 404 }
      );
    }

    // Crear el registro de lista de chequeo
    const listaChequeo = await prisma.listaChequeo.create({
      data: {
        automovilId: automovil.id,
        fecha: new Date(),
        inspector: nombreInspector,
        items: JSON.stringify({
          fechaInspeccion: new Date().toISOString(),
          estado: 'completado'
        })
      }
    });

    return NextResponse.json({
      success: true,
      mensaje: 'Lista de chequeo guardada exitosamente',
      listaChequeo: {
        id: listaChequeo.id,
        fecha: listaChequeo.fecha,
        inspector: listaChequeo.inspector,
        items: listaChequeo.items,
        movil: numeroMovil
      }
    });

  } catch (error) {
    console.error('Error al guardar lista de chequeo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Nueva función para crear chequeo masivo de todos los móviles
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombreInspector } = body;

    if (!nombreInspector) {
      return NextResponse.json(
        { error: 'Nombre del inspector es requerido' },
        { status: 400 }
      );
    }

    // Obtener todos los automóviles activos que no tienen chequeo hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    const automovilesActivos = await prisma.automovil.findMany({
      where: {
        activo: true
      },
      include: {
        listaChequeo: {
          where: {
            fecha: {
              gte: hoy,
              lt: mañana
            }
          }
        }
      }
    });

    // Filtrar solo los que no tienen chequeo hoy
    const automovilesSinChequeo = automovilesActivos.filter(auto => auto.listaChequeo.length === 0);

    if (automovilesSinChequeo.length === 0) {
      return NextResponse.json({
        success: true,
        mensaje: 'Todos los móviles ya tienen su chequeo completado',
        chequeosCreados: 0,
        totalMoviles: automovilesActivos.length
      });
    }

    // Crear chequeos para todos los móviles pendientes
    const chequeosCreados = await Promise.all(
      automovilesSinChequeo.map(async (automovil) => {
        return await prisma.listaChequeo.create({
          data: {
            automovilId: automovil.id,
            fecha: new Date(),
            inspector: nombreInspector,
            items: JSON.stringify({
              fechaInspeccion: new Date().toISOString(),
              estado: 'completado',
              creacionMasiva: true
            })
          }
        });
      })
    );

    return NextResponse.json({
      success: true,
      mensaje: `Se completaron ${chequeosCreados.length} chequeos automáticamente`,
      chequeosCreados: chequeosCreados.length,
      totalMoviles: automovilesActivos.length,
      movilesChequeados: chequeosCreados.map(chequeo => {
        const automovil = automovilesSinChequeo.find(auto => auto.id === chequeo.automovilId);
        return {
          id: chequeo.id,
          movil: automovil?.movil,
          placa: automovil?.placa
        };
      })
    });

  } catch (error) {
    console.error('Error al crear chequeos masivos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
