import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import { formatDateToYYYYMMDDLocal } from '@/src/lib/utils'
import { cookies } from 'next/headers'

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
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            usuario: true
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
      automovil: p.automovil,
      usuario: p.usuario,
      fechaCreacion: p.fechaCreacion
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

    // Obtener el usuario actual de la sesión
    let usuarioActual = null;
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session');
      
      console.log('🔍 Debug sesión - Cookie encontrada:', !!sessionCookie?.value);
      
      if (sessionCookie?.value) {
        const sessionData = JSON.parse(sessionCookie.value);
        console.log('🔍 Debug sesión - Datos de sesión:', {
          hasUser: !!sessionData,
          userId: sessionData?.id,
          userName: sessionData?.nombre,
          fullSession: sessionData
        });
        // La sesión ya contiene los datos del usuario directamente
        usuarioActual = sessionData;
      }
    } catch (sessionError) {
      console.log('❌ Error al obtener el usuario de la sesión:', sessionError);
      // Continuar sin usuario - las columnas son opcionales
    }

    console.log('👤 Usuario actual para planillas:', {
      hasUser: !!usuarioActual,
      userId: usuarioActual?.id,
      userName: usuarioActual?.nombre
    });

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
        const planillaData: any = {
          automovilId: automovilId,
          fecha: new Date(fecha + 'T00:00:00'),
          observaciones: 'Planilla creada automáticamente'
        };

        // Agregar usuario si está disponible
        if (usuarioActual?.id) {
          planillaData.usuarioId = usuarioActual.id;
          console.log(`📝 Creando planilla para fecha ${fecha} con usuario ID: ${usuarioActual.id} (${usuarioActual.nombre})`);
        } else {
          console.log(`📝 Creando planilla para fecha ${fecha} SIN usuario asociado`);
        }

        const nuevaPlanilla = await prisma.planilla.create({
          data: planillaData
        });

        console.log(`✅ Planilla creada con ID: ${nuevaPlanilla.id}, usuarioId: ${nuevaPlanilla.usuarioId}`);

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