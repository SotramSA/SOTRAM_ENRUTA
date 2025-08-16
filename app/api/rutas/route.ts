import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function GET() {
  try {
    const rutas = await prisma.ruta.findMany({
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json(rutas);
  } catch (error) {
    console.error('Error al obtener rutas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar campos requeridos
    if (!body.nombre) {
      return NextResponse.json(
        { error: 'El nombre de la ruta es requerido' },
        { status: 400 }
      );
    }

    const {
      nombre,
      descripcion,
      frecuenciaMin,
      frecuenciaMax,
      frecuenciaDefault,
      frecuenciaActual,
      prioridad,
      unaVezDia,
      activo
    } = body;

    // Verificar si la ruta ya existe
    const existingRuta = await prisma.ruta.findFirst({
      where: { nombre }
    });

    if (existingRuta) {
      return NextResponse.json(
        { error: 'Ya existe una ruta con ese nombre' },
        { status: 400 }
      );
    }

    // Crear la nueva ruta
    const nuevaRuta = await prisma.ruta.create({
      data: {
        nombre: nombre.toString(),
        descripcion: descripcion || null,
        frecuenciaMin: parseInt(frecuenciaMin) || 2,
        frecuenciaMax: parseInt(frecuenciaMax) || 10,
        frecuenciaDefault: parseInt(frecuenciaDefault) || 6,
        frecuenciaActual: parseInt(frecuenciaActual) || 6,
        prioridad: parseInt(prioridad) || 0,
        unaVezDia: Boolean(unaVezDia),
        activo: Boolean(activo),
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      }
    });

    return NextResponse.json(nuevaRuta, { status: 201 });
  } catch (error) {
    console.error('Error al crear ruta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 