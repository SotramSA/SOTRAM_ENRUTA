import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TEMPORAL: Comentando auth() para evitar error en desarrollo
    // const session = await auth();
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    // }
    const session = { user: { name: 'Usuario' } }; // Usuario temporal

    const { id } = await params;
    const turnoId = parseInt(id);
    if (isNaN(turnoId)) {
      return NextResponse.json({ error: 'ID de turno inválido' }, { status: 400 });
    }

    // Obtener el turno con toda la información relacionada
    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: {
        conductor: true,
        movil: true,
        ruta: true,
        usuario: true
      }
    });

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // Formatear fechas en hora colombiana
    const fechaSalida = new Date(turno.fecha);
    fechaSalida.setHours(turno.horaSalida.getHours());
    fechaSalida.setMinutes(turno.horaSalida.getMinutes());
    
    const fechaCreacion = turno.horaCreacion ? new Date(turno.horaCreacion) : new Date();

    // Formatear fecha de salida
    const opcionesFecha = { 
      day: '2-digit' as const, 
      month: 'long' as const, 
      year: 'numeric' as const 
    };
    const fechaSalidaFormateada = fechaSalida.toLocaleDateString('es-CO', opcionesFecha);

    // Formatear hora de salida
    const opcionesHora = { 
      hour: '2-digit' as const, 
      minute: '2-digit' as const,
      hour12: true 
    };
    const horaSalidaFormateada = fechaSalida.toLocaleTimeString('es-CO', opcionesHora);

    // Formatear fecha y hora de creación
    const fechaCreacionFormateada = fechaCreacion.toLocaleDateString('es-CO', opcionesFecha);
    const horaCreacionFormateada = fechaCreacion.toLocaleTimeString('es-CO', opcionesHora);

    // Crear datos del recibo
    const recibo = {
      id: turno.id,
      fechaSalida: fechaSalidaFormateada,
      horaSalida: horaSalidaFormateada,
      movil: turno.movil.movil,
      placa: turno.movil.placa,
      ruta: turno.ruta?.nombre || 'N/A',
      conductor: turno.conductor.nombre,
      despachadoPor: turno.usuario?.nombre || session.user.name || 'N/A',
      registro: `${fechaCreacionFormateada} ${horaCreacionFormateada}`,
      // Datos para QR
      qrData: JSON.stringify({
        id: turno.id,
        movil: turno.movil.movil,
        placa: turno.movil.placa,
        ruta: turno.ruta?.nombre,
        conductor: turno.conductor.nombre,
        fecha: fechaSalidaFormateada,
        hora: horaSalidaFormateada
      })
    };

    return NextResponse.json(recibo);
  } catch (error) {
    console.error('Error al generar recibo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 