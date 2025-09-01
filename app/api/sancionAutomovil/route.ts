import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Probando conexión a sancionAutomovil...');
    
    const sanciones = await prisma.sancionAutomovil.findMany({
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
        fecha: s.fecha.toISOString().slice(0, 10)
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
    const { automovilId, fecha, descripcion, monto } = await request.json();
    
    if (!automovilId || !fecha || !descripcion || !monto) {
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
        fecha: new Date(fecha),
        descripcion: descripcion.trim(),
        monto: parseFloat(monto.toString())
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