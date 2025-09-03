import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { automovilId, conductorId, rutaId, horaSalida } = body;

    // Validar datos requeridos
    if (!automovilId || !conductorId || !rutaId || !horaSalida) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Obtener el usuario actual desde la sesión
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    let usuarioActual = 'Sistema';
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        usuarioActual = sessionData?.nombre || 'Sistema';
      } catch (error) {
        console.log('⚠️ Error al parsear sesión:', error);
      }
    }

    // Obtener datos del automóvil
    const automovil = await prisma.automovil.findUnique({
      where: { id: automovilId }
    });

    if (!automovil) {
      return NextResponse.json(
        { error: 'Automóvil no encontrado' },
        { status: 404 }
      );
    }

    // Obtener datos del conductor
    const conductor = await prisma.conductor.findUnique({
      where: { id: conductorId }
    });

    if (!conductor) {
      return NextResponse.json(
        { error: 'Conductor no encontrado' },
        { status: 404 }
      );
    }

    // Obtener datos de la ruta
    const ruta = await prisma.ruta.findUnique({
      where: { id: rutaId }
    });

    if (!ruta) {
      return NextResponse.json(
        { error: 'Ruta no encontrada' },
        { status: 404 }
      );
    }

    // Obtener zona horaria desde variables de entorno o usar Colombia por defecto
    const zonaHoraria = process.env.TIMEZONE || 'America/Bogota';
    
    // Formatear fecha actual
    const fechaActual = new Date();
    const opcionesFecha = { 
      day: '2-digit' as const, 
      month: 'long' as const, 
      year: 'numeric' as const,
      timeZone: zonaHoraria
    };
    const fechaFormateada = fechaActual.toLocaleDateString('es-CO', opcionesFecha);

    // Formatear hora de salida (usar la hora exacta sin conversiones de zona horaria)
    const [hours, minutes] = horaSalida.split(':');
    const horasNum = parseInt(hours);
    const minutosNum = parseInt(minutes);
    
    // Determinar si es AM o PM
    const esPM = horasNum >= 12;
    const horas12 = horasNum > 12 ? horasNum - 12 : (horasNum === 0 ? 12 : horasNum);
    
    // Formatear directamente sin conversiones de zona horaria
    const horaSalidaFormateada = `${horas12.toString().padStart(2, '0')}:${minutosNum.toString().padStart(2, '0')} ${esPM ? 'p. m.' : 'a. m.'}`;

    // Formatear fecha y hora de registro
    const fechaRegistroFormateada = fechaActual.toLocaleDateString('es-CO', opcionesFecha);
    const opcionesHoraRegistro = { 
      hour: '2-digit' as const, 
      minute: '2-digit' as const,
      hour12: true,
      timeZone: zonaHoraria
    };
    const horaRegistroFormateada = fechaActual.toLocaleTimeString('es-CO', opcionesHoraRegistro);

    // Generar un ID único para el recibo manual (usando timestamp)
    const reciboId = `M${Date.now()}`;

    // Preparar nombre de la ruta con prefijo si no lo tiene
    const rutaNombre = ruta.nombre.startsWith('DESPACHO') 
      ? ruta.nombre 
      : `DESPACHO ${ruta.nombre}`;

    // Crear datos del recibo
    const recibo = {
      id: reciboId,
      fechaSalida: fechaFormateada,
      horaSalida: horaSalidaFormateada,
      movil: automovil.movil,
      placa: automovil.placa,
      ruta: rutaNombre,
      conductor: conductor.nombre,
      despachadoPor: usuarioActual,
      registro: `${fechaRegistroFormateada} ${horaRegistroFormateada}`,
      tipo: 'manual'
    };

    // Log para auditoría
    console.log('📄 Recibo manual generado:', {
      id: reciboId,
      automovil: automovil.movil,
      conductor: conductor.nombre,
      ruta: rutaNombre,
      horaSalida: horaSalidaFormateada,
      despachadoPor: usuarioActual,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(recibo);

  } catch (error) {
    console.error('❌ Error generando recibo manual:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
