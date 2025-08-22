import { prisma } from '@/src/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const automovilId = searchParams.get('automovilId');

    const skip = (page - 1) * limit;

    // Construir la consulta con búsqueda y filtro por automóvil
    const where: any = {};
    
    if (automovilId) {
      where.automovilId = parseInt(automovilId);
    }
    
    if (search) {
      where.OR = [
        { automovil: { movil: { contains: search } } },
        { automovil: { placa: { contains: search } } },
        { motivo: { contains: search } }
      ];
    }

    // Obtener sanciones con paginación, búsqueda y relaciones
    const [sanciones, total] = await Promise.all([
      prisma.sancionAutomovil.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          automovilId: true,
          fechaInicio: true,
          fechaFin: true,
          motivo: true,
          automovil: {
            select: {
              id: true,
              movil: true,
              placa: true
            }
          }
        },
        orderBy: [
          { fechaInicio: 'desc' }, // Más recientes primero
          { automovil: { movil: 'asc' } } // Luego por móvil del automóvil
        ]
      }),
      prisma.sancionAutomovil.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      sanciones: sanciones.map(s => ({
        ...s,
        fechaInicio: s.fechaInicio.toISOString().slice(0, 10),
        fechaFin: s.fechaFin.toISOString().slice(0, 10)
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
    const { automovilId, fechaInicio, fechaFin, motivo } = await request.json();
    
    if (!automovilId || !fechaInicio || !fechaFin || !motivo) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Verificar que el automóvil existe y está activo
    const automovil = await prisma.automovil.findFirst({
      where: { id: automovilId, activo: true }
    });

    if (!automovil) {
      return NextResponse.json({ error: 'Automóvil no encontrado o inactivo' }, { status: 400 });
    }

    // Verificar que las fechas son válidas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    if (fin < inicio) {
      return NextResponse.json({ error: 'La fecha de fin no puede ser menor a la fecha de inicio' }, { status: 400 });
    }

    // Crear la sanción
    const nuevaSancion = await prisma.sancionAutomovil.create({
      data: {
        automovilId,
        fechaInicio: inicio,
        fechaFin: fin,
        motivo: motivo.trim()
      },
      include: {
        automovil: {
          select: {
            id: true,
            movil: true,
            placa: true
          }
        }
      }
    });
    
    return NextResponse.json(nuevaSancion, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear sanción' }, { status: 500 });
  }
} 