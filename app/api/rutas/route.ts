import prismaWithRetry from '@/lib/prismaClient'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const rutas = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.ruta.findMany({
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          activo: true,
          descripcion: true
        },
        orderBy: { prioridad: 'desc' }
      })
    })

    return NextResponse.json({ success: true, data: rutas })
  } catch (error) {
    console.error('Error fetching rutas:', error)
    return NextResponse.json({ success: false, error: 'Error fetching rutas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.nombre) {
      return NextResponse.json({ error: 'El nombre de la ruta es requerido' }, { status: 400 })
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
    } = body

    const existingRuta = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.ruta.findFirst({ where: { nombre } })
    })

    if (existingRuta) {
      return NextResponse.json({ error: 'Ya existe una ruta con ese nombre' }, { status: 400 })
    }

    const nuevaRuta = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.ruta.create({
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
      })
    })

    return NextResponse.json({ success: true, data: nuevaRuta }, { status: 201 })
  } catch (error) {
    console.error('Error al crear ruta:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}