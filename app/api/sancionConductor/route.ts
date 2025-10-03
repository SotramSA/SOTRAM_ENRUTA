import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Construir la consulta con búsqueda
    const where = search ? {
      OR: [
        { conductor: { nombre: { contains: search } } },
        { conductor: { cedula: { contains: search } } },
        { descripcion: { contains: search } }
      ]
    } : {};

    // Obtener sanciones con paginación, búsqueda y relaciones
    const [sanciones, total] = await Promise.all([
      prisma.sancionConductor.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { fechaInicio: 'desc' }, // Más recientes primero
          { conductor: { nombre: 'asc' } } // Luego por nombre del conductor
        ],
        include: {
          conductor: {
            select: {
              id: true,
              nombre: true,
              cedula: true
            }
          }
        }
      }),
      prisma.sancionConductor.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      sanciones: sanciones.map(s => ({
        ...s,
        motivo: s.descripcion
      })),
      total,
      totalPages,
      page,
      limit
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener sanciones' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Removed request body logging to avoid sensitive data exposure
    const conductorId = body.conductorId;
    const fechaInicio = body.fechaInicio;
    const fechaFin = body.fechaFin;
    const descripcion = (body.descripcion ?? body.motivo ?? '').toString();

    if (!conductorId || !fechaInicio || !fechaFin || !descripcion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Verificar que el conductor existe y está activo
    const conductor = await prisma.conductor.findFirst({
      where: { id: conductorId, activo: true }
    });

    if (!conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado o inactivo' }, { status: 400 });
    }

    // Crear la sanción
    const nuevaSancion = await prisma.sancionConductor.create({
      data: {
        conductorId,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        descripcion: descripcion.trim()
      },
      include: {
        conductor: {
          select: {
            id: true,
            nombre: true,
            cedula: true
          }
        }
      }
    });
    
    return NextResponse.json(nuevaSancion, { status: 201 });
  } catch (error) {
    console.error('Error en sancionConductor POST:', error);
    return NextResponse.json({ 
      error: 'Error al crear sanción',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}