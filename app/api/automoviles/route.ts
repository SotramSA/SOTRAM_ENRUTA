import { prisma } from '@/src/lib/prisma';
import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const activo = searchParams.get('activo');
    const movil = searchParams.get('movil'); // Búsqueda específica por número de móvil

    const skip = (page - 1) * limit;

    // Construir la consulta con búsqueda insensible a mayúsculas y minúsculas y filtro de activo
    const where: any = {};
    
    // Si se busca un móvil específico, priorizar esa búsqueda
    if (movil) {
      where.movil = { equals: movil, mode: 'insensitive' };
    } else if (search) {
      where.OR = [
        { movil: { contains: search, mode: 'insensitive' } },
        { placa: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (activo !== null) {
      where.activo = activo === 'true';
    }

    // Obtener automóviles con paginación, búsqueda y relaciones
    const [automoviles, total] = await Promise.all([
      prisma.automovil.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { activo: 'desc' }, // Primero los activos (true antes que false)
          { movil: 'asc' }    // Luego por orden alfabético del móvil
        ],
        include: {
          automovilPropietario: {
            include: {
              propietario: {
                select: {
                  id: true,
                  nombre: true,
                  cedula: true,
                }
              }
            }
          },
          conductorAutomovil: {
            include: {
              conductor: {
                select: {
                  id: true,
                  nombre: true,
                  cedula: true
                }
              }
            }
          }
        }
      }),
      prisma.automovil.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      automoviles,
      total,
      totalPages,
      page,
      limit
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener automóviles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { movil, placa, activo, disponible, propietarios, conductores, soat, revisionTecnomecanica, tarjetaOperacion, licenciaTransito, extintor, revisionPreventiva } = await request.json();
    
    if (!movil || !placa) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Crear automóvil y sus relaciones con conductores en una transacción
    const nuevoAutomovil = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const automovil = await tx.automovil.create({
        data: { 
          movil, 
          placa, 
          activo: activo !== undefined ? activo : true,
          disponible: disponible !== undefined ? disponible : true,
          soat: soat ? new Date(soat) : null,
          revisionTecnomecanica: revisionTecnomecanica ? new Date(revisionTecnomecanica) : null,
          tarjetaOperacion: tarjetaOperacion ? new Date(tarjetaOperacion) : null,
          licenciaTransito: licenciaTransito ? new Date(licenciaTransito) : null,
          extintor: extintor ? new Date(extintor) : null,
          revisionPreventiva: revisionPreventiva ? new Date(revisionPreventiva) : null,
        }
      });

      // Crear relaciones con propietarios si se proporcionan
      if (Array.isArray(propietarios) && propietarios.length > 0) {
        await tx.automovilPropietario.createMany({
          data: propietarios.map((propietarioId: number) => ({
            automovilId: automovil.id,
            propietarioId,
            activo: true,
          }))
        });
      }

      // Crear relaciones con conductores si se proporcionan
      if (conductores && conductores.length > 0) {
        await tx.conductorAutomovil.createMany({
          data: conductores.map((conductorId: number) => ({
            automovilId: automovil.id,
            conductorId,
            activo: true
          }))
        });
      }

      return automovil;
    });
    
    return NextResponse.json(nuevoAutomovil, { status: 201 });
  } catch (error) {
    console.error('Error al crear automóvil:', error);
    return NextResponse.json({ 
      error: 'Error al crear automóvil',
      details: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 