import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { isoToTimeHHMM } from '@/src/lib/utils';
import { getSessionUser } from '@/src/lib/authHelper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Obtener el usuario de la sesión
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

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
        automovil: true,
        ruta: true,
        usuario: true
      }
    });

    if (!turno) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // Obtener zona horaria desde variables de entorno o usar Colombia por defecto
    const zonaHoraria = process.env.TIMEZONE || 'America/Bogota';
    
    // Formatear fecha de salida (solo fecha, sin hora)
    const fechaSalida = new Date(turno.fecha);
    const opcionesFecha = { 
      day: '2-digit' as const, 
      month: 'long' as const, 
      year: 'numeric' as const,
      timeZone: zonaHoraria
    };
    const fechaSalidaFormateada = fechaSalida.toLocaleDateString('es-CO', opcionesFecha);

    // Formatear hora de salida en HH:mm usando UTC sobre el ISO almacenado
    const horaSalidaISO = turno.horaSalida instanceof Date 
      ? turno.horaSalida.toISOString() 
      : String(turno.horaSalida);
    const horaSalidaFormateada = isoToTimeHHMM(horaSalidaISO);
    
    const fechaCreacion = turno.horaCreacion ? new Date(turno.horaCreacion) : new Date();

    // Formatear fecha y hora de creación
    const fechaCreacionFormateada = fechaCreacion.toLocaleDateString('es-CO', opcionesFecha);
    const horaCreacionFormateada = fechaCreacion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: zonaHoraria });

    // Crear datos del recibo
    const recibo = {
      id: turno.id,
      fechaSalida: fechaSalidaFormateada,
      horaSalida: horaSalidaFormateada,
      movil: turno.automovil.movil,
      placa: turno.automovil.placa,
      ruta: turno.ruta?.nombre || 'N/A',
      conductor: turno.conductor.nombre,
      despachadoPor: turno.usuario?.nombre || sessionUser.nombre || 'N/A',
      registro: `${fechaCreacionFormateada} ${horaCreacionFormateada}`,
      // Datos para QR
      qrData: JSON.stringify({
        id: turno.id,
        movil: turno.automovil.movil,
        placa: turno.automovil.placa,
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