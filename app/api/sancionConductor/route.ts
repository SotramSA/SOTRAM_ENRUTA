import { prisma } from '@/src/lib/prisma';
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
        { motivo: { contains: search } }
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
      sanciones,
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
    const { conductorId, fechaInicio, fechaFin, motivo } = await request.json();
    
    if (!conductorId || !fechaInicio || !fechaFin || !motivo) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Verificar que el conductor existe y está activo
    const conductor = await prisma.conductor.findFirst({
      where: { id: conductorId, activo: true }
    });

    if (!conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado o inactivo' }, { status: 400 });
    }

    // Verificar que las fechas son válidas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    if (fin < inicio) {
      return NextResponse.json({ error: 'La fecha de fin no puede ser menor a la fecha de inicio' }, { status: 400 });
    }

    // Crear la sanción
    const nuevaSancion = await prisma.sancionConductor.create({
      data: {
        conductorId,
        fechaInicio: inicio,
        fechaFin: fin,
        motivo: motivo.trim()
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
    return NextResponse.json({ error: 'Error al crear sanción' }, { status: 500 });
  }
} 