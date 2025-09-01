import prismaWithRetry from '@/lib/prismaClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Construir la consulta con búsqueda insensible a mayúsculas y minúsculas
    const where = search ? {
      OR: [
        { nombre: { contains: search, mode: 'insensitive' as const } },
        { cedula: { contains: search, mode: 'insensitive' as const } },
        { correo: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    console.log('🔍 Consultando conductores con filtros:', { where, skip, limit });

    // Obtener conductores con paginación, búsqueda y relaciones
    const [conductores, total] = await Promise.all([
      prismaWithRetry.executeWithRetry(async () => {
        return await prismaWithRetry.conductor.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { activo: 'desc' }, // Primero los activos (true antes que false)
            { nombre: 'asc' }   // Luego por orden alfabético del nombre
          ],
          include: {
            conductorAutomovil: {
              include: {
                automovil: {
                  select: {
                    id: true,
                    movil: true,
                    placa: true
                  }
                }
              }
            }
          }
        });
      }),
      prismaWithRetry.executeWithRetry(async () => {
        return await prismaWithRetry.conductor.count({ where });
      })
    ]);

    console.log('✅ Conductores obtenidos:', { count: conductores.length, total });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      conductores,
      total,
      totalPages,
      page,
      limit
    });
  } catch (error) {
    console.error('❌ Error al obtener conductores:', error);
    return NextResponse.json({ 
      error: 'Error al obtener conductores',
      details: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  } finally {
    await prismaWithRetry.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre, cedula, telefono, correo, observaciones, activo, automoviles, licenciaConduccion } = await request.json();
    
    if (!nombre || !cedula) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Crear conductor y sus relaciones con automóviles en una transacción
    const nuevoConductor = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.$transaction(async (tx) => {
        const conductor = await tx.conductor.create({
          data: { 
            nombre, 
            cedula, 
            telefono: telefono || null,
            correo: correo || null,
            observaciones: observaciones || null,
            licenciaConduccion: licenciaConduccion ? new Date(licenciaConduccion) : null,
            activo: activo !== undefined ? activo : true,
          }
        });

        // Crear relaciones con automóviles si se proporcionan
        if (automoviles && automoviles.length > 0) {
          await tx.conductorAutomovil.createMany({
            data: automoviles.map((automovilId: number) => ({
              conductorId: conductor.id,
              automovilId,
              activo: true
            }))
          });
        }

        return conductor;
      });
    });
    
    return NextResponse.json(nuevoConductor, { status: 201 });
  } catch (error) {
    console.error('❌ Error al crear conductor:', error);
    return NextResponse.json({ 
      error: 'Error al crear conductor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  } finally {
    await prismaWithRetry.$disconnect();
  }
} 