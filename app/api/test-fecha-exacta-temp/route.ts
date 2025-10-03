import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { movilId, conductorId, despacho, hora } = await request.json();

    // Validar parámetros requeridos
    if (!movilId || !conductorId || !despacho || !hora) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Faltan parámetros requeridos: movilId, conductorId, despacho, hora' 
        },
        { status: 400 }
      );
    }

    // Convertir hora a formato exacto - usar fecha actual del sistema
    const [horas, minutos] = hora.split(':').map(Number);
    const ahora = new Date(); // Usar fecha actual del sistema directamente
    const fechaAsignacion = new Date(); // Crear nueva fecha para la hora de salida
    fechaAsignacion.setHours(horas, minutos, 0, 0);

    // Mapear tipo de despacho a rutaId
    let rutaId: number;
    switch (despacho) {
      case 'DESPACHO_A':
        rutaId = 1;
        break;
      case 'DESPACHO_B':
        rutaId = 2;
        break;
      case 'DESPACHO_C':
        rutaId = 3;
        break;
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Tipo de despacho no reconocido' 
          },
          { status: 400 }
        );
    }

    // Crear el turno directamente usando fechas exactas del sistema
    const ahoraDirecto = new Date(); // Fecha y hora actual del sistema

    const turno = await prisma.turno.create({
      data: {
        movilId: parseInt(movilId),
        conductorId: parseInt(conductorId),
        rutaId,
        fecha: ahoraDirecto,
        horaSalida: fechaAsignacion,
        horaCreacion: ahoraDirecto,
        estado: 'PENDIENTE',
        usuarioId: 1 // Usuario de prueba
      },
      include: {
        ruta: true,
        conductor: true,
        automovil: true
      }
    });

    return NextResponse.json({
      success: true,
      turno,
      debug: {
        fechaCreada: turno.fecha,
        horaSalidaCreada: turno.horaSalida,
        horaCreacionCreada: turno.horaCreacion,
        fechaLocal: new Date(turno.fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        horaSalidaLocal: new Date(turno.horaSalida).toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        horaCreacionLocal: turno.horaCreacion
          ? new Date(turno.horaCreacion).toLocaleString('es-CO', { timeZone: 'America/Bogota' })
          : null
      }
    });

  } catch (error) {
    console.error('Error creando turno de prueba:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}