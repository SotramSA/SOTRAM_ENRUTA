import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { formatDateToYYYYMMDDLocal } from '@/src/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const automovilId = searchParams.get('automovilId')
    const año = searchParams.get('año')
    const mes = searchParams.get('mes')

    if (!automovilId || !año || !mes) {
      return NextResponse.json(
        { error: 'Se requieren automovilId, año y mes' },
        { status: 400 }
      )
    }

    // Construir el rango de fechas para el mes de manera más eficiente
    const fechaInicio = new Date(parseInt(año), parseInt(mes) - 1, 1)
    const fechaFin = new Date(parseInt(año), parseInt(mes), 0, 23, 59, 59)

    // Buscar planillas directamente por automovilId y rango de fechas
    const planillas = await prisma.planilla.findMany({
      where: {
        automovilId: parseInt(automovilId),
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      include: {
        automovil: {
          select: {
            id: true,
            movil: true,
            placa: true
          }
        }
      },
      orderBy: {
        fecha: 'asc'
      }
    })

    console.log('📅 Planillas encontradas:', planillas.length)

    const planillasFormateadas = planillas.map(p => ({
      id: p.id,
      fecha: p.fecha.toISOString().slice(0, 10),
      observaciones: p.observaciones,
      automovil: p.automovil
    }))

    console.log('📅 Planillas devueltas por API:', planillasFormateadas.map(p => ({ id: p.id, fecha: p.fecha })))

    return NextResponse.json({
      planillas: planillasFormateadas
    })
  } catch (error) {
    console.error('Error al obtener planillas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { automovilId, fechas } = body

    if (!automovilId || !fechas || !Array.isArray(fechas)) {
      return NextResponse.json(
        { error: 'Se requieren automovilId y fechas' },
        { status: 400 }
      )
    }

    // Verificar que el automóvil existe
    const automovil = await prisma.automovil.findUnique({
      where: { id: automovilId }
    })

    if (!automovil) {
      return NextResponse.json(
        { error: 'Automóvil no encontrado' },
        { status: 404 }
      )
    }

    let planillasCreadas = 0;
    const fechasCreadas: string[] = [];
    const fechasExistentes: string[] = [];
    const fechasConError: string[] = [];

    // Crear planillas independientes para cada fecha
    for (const fecha of fechas) {
      try {
        // Verificar si ya existe una planilla para esta fecha y móvil
        // Comparar solo fechas, sin horas
        const fechaObj = new Date(fecha + 'T00:00:00')
        const planillaExistente = await prisma.planilla.findFirst({
          where: {
            automovilId: automovilId,
            fecha: fechaObj
          }
        });

        if (planillaExistente) {
          console.log(`Ya existe una planilla para el móvil ${automovilId} en la fecha ${fecha}`);
          fechasExistentes.push(fecha);
          continue;
        }

        // Crear la planilla directamente - solo fecha, sin horas
        await prisma.planilla.create({
          data: {
            automovilId: automovilId,
            fecha: new Date(fecha + 'T00:00:00'),
            observaciones: 'Planilla creada automáticamente'
          }
        });

        planillasCreadas++;
        fechasCreadas.push(fecha);
        console.log(`✅ Planilla creada exitosamente para fecha ${fecha}`);
      } catch (error) {
        console.error(`Error al crear planilla para fecha ${fecha}:`, error);
        fechasConError.push(fecha);
        // Continuar con las siguientes fechas
      }
    }

    // Construir mensaje informativo
    let mensaje = '';
    if (planillasCreadas > 0) {
      mensaje += `${planillasCreadas} planilla(s) creada(s) correctamente. `;
    }
    if (fechasExistentes.length > 0) {
      mensaje += `${fechasExistentes.length} fecha(s) ya tenían planilla existente. `;
    }
    if (fechasConError.length > 0) {
      mensaje += `${fechasConError.length} fecha(s) con error.`;
    }

    return NextResponse.json({
      message: mensaje.trim(),
      count: planillasCreadas,
      fechasCreadas,
      fechasExistentes,
      fechasConError
    }, { status: 201 })
  } catch (error) {
    console.error('Error al crear planillas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const planillaId = searchParams.get('id')

    if (!planillaId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la planilla' },
        { status: 400 }
      )
    }

    // Verificar que la planilla existe
    const planilla = await prisma.planilla.findUnique({
      where: { id: parseInt(planillaId) }
    })

    if (!planilla) {
      return NextResponse.json(
        { error: 'Planilla no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la planilla
    await prisma.planilla.delete({
      where: { id: parseInt(planillaId) }
    })

    return NextResponse.json({
      message: 'Planilla eliminada correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar planilla:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 