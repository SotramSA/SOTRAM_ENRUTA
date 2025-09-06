import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Probando conexión a sancionAutomovil...');
    
    const sanciones = await prisma.sancionAutomovil.findMany({
      orderBy: [{ fechaInicio: 'desc' }],
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

    console.log('Sanciones encontradas:', sanciones.length);

    return NextResponse.json({
      sanciones: sanciones.map(s => ({
        ...s,
        motivo: s.descripcion
      })),
      total: sanciones.length,
      totalPages: 1,
      page: 1,
      limit: 10
    });
  } catch (error) {
    console.error('Error en sancionAutomovil GET:', error);
    return NextResponse.json({ 
      error: 'Error al obtener sanciones',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('POST /api/sancionAutomovil body:', body);
    const automovilId = body.automovilId;
    const fechaInicio = body.fechaInicio;
    const fechaFin = body.fechaFin;
    const descripcion = (body.descripcion ?? body.motivo ?? '').toString();

    if (!automovilId || !fechaInicio || !fechaFin || !descripcion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Verificar que el automóvil existe y está activo
    const automovil = await prisma.automovil.findFirst({
      where: { id: automovilId, activo: true }
    });

    if (!automovil) {
      return NextResponse.json({ error: 'Automóvil no encontrado o inactivo' }, { status: 400 });
    }

    // Crear la sanción
    const nuevaSancion = await prisma.sancionAutomovil.create({
      data: {
        automovilId,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        descripcion: descripcion.trim()
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
    console.error('Error en sancionAutomovil POST:', error);
    return NextResponse.json({ 
      error: 'Error al crear sanción',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 