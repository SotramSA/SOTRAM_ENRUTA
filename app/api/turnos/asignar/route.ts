import { NextRequest, NextResponse } from 'next/server';
import { TurnoService } from '@/src/lib/turnoService';
import { TimeService } from '@/src/lib/timeService';
import { getSessionUser } from '@/src/lib/authHelper';
import { prisma } from '@/src/lib/prisma';

const turnoService = new TurnoService();

export async function POST(request: NextRequest) {
  try {
    // Configurar la hora simulada desde los headers
    TimeService.setFromHeaders(request.headers);

    // Verificar autenticación
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { movilId, conductorId, despacho, hora } = body;

    // Validaciones
    if (!movilId || !conductorId || !despacho || !hora) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan campos requeridos: movilId, conductorId, despacho, hora'
        },
        { status: 400 }
      );
    }

    // Validar que movilId y conductorId sean números
    if (isNaN(parseInt(movilId)) || isNaN(parseInt(conductorId))) {
      return NextResponse.json(
        {
          success: false,
          error: 'movilId y conductorId deben ser números válidos'
        },
        { status: 400 }
      );
    }

    // Validar formato de hora (debe ser HH:MM)


    const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(hora)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de hora inválido. Use HH:MM'
        },
        { status: 400 }
      );
    }

    // Validar tipo de despacho
    const tiposDespachoValidos = ['DESPACHO_A', 'DESPACHO_B', 'DESPACHO_C'];
    if (!tiposDespachoValidos.includes(despacho)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo de despacho inválido. Debe ser DESPACHO_A, DESPACHO_B o DESPACHO_C'
        },
        { status: 400 }
      );
    }

    // Convertir hora a formato ISO string - usar fecha actual del sistema
    const [horas, minutos] = hora.split(':').map(Number);
    const ahora = new Date(); // Usar fecha actual del sistema directamente
    const fechaAsignacion = new Date(); // Crear nueva fecha para la hora de salida
    fechaAsignacion.setHours(horas, minutos, 0, 0);

    // Mapear tipo de despacho a rutaId
    let rutaId: number;
    switch (despacho) {
      case 'DESPACHO_A':
        rutaId = 1; // Despacho A
        break;
      case 'DESPACHO_B':
        rutaId = 2; // Despacho B
        break;
      case 'DESPACHO_C':
        rutaId = 3; // Despacho C
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

    // Validar que el conductor existe y está activo
    const conductor = await prisma.conductor.findUnique({
      where: { id: parseInt(conductorId) },
      select: { id: true, nombre: true, activo: true }
    });

    if (!conductor) {
      return NextResponse.json(
        {
          success: false,
          error: `Conductor con ID ${conductorId} no encontrado`
        },
        { status: 400 }
      );
    }

    if (!conductor.activo) {
      return NextResponse.json(
        {
          success: false,
          error: `Conductor ${conductor.nombre} no está activo`
        },
        { status: 400 }
      );
    }

    // Validar que el automóvil existe y está activo
    const automovil = await prisma.automovil.findUnique({
      where: { id: parseInt(movilId) },
      select: { id: true, movil: true, activo: true }
    });

    if (!automovil) {
      return NextResponse.json(
        {
          success: false,
          error: `Automóvil con ID ${movilId} no encontrado`
        },
        { status: 400 }
      );
    }

    if (!automovil.activo) {
      return NextResponse.json(
        {
          success: false,
          error: `Automóvil ${automovil.movil} no está activo`
        },
        { status: 400 }
      );
    }

    // Crear el turno directamente en la base de datos usando la fecha y hora exactas
    // Sin conversiones de zona horaria - usar exactamente lo que se proporciona
    const ahoraDirecto = new Date(); // Fecha y hora actual del sistema


    function toFixedISOString(date: Date): string {
      const pad = (num: number, size: number = 2) => String(num).padStart(size, "0");

      return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate()) +
        "T" +
        pad(date.getHours()) +
        ":" +
        pad(date.getMinutes()) +
        ":" +
        pad(date.getSeconds()) +
        "." +
        pad(date.getMilliseconds(), 3) +
        "Z"
      );
    }



    
    const turno = await prisma.turno.create({
      data: {
        movilId: parseInt(movilId),
        conductorId: parseInt(conductorId),
        rutaId,
        fecha: toFixedISOString(ahoraDirecto),
        horaSalida: toFixedISOString(fechaAsignacion),
        horaCreacion: toFixedISOString(ahoraDirecto),
        estado: 'COMPLETADO',
        usuarioId: user.id
      },
      include: {
        ruta: true,
        automovil: true,
        conductor: true,
        usuario: true
      }
    });

    // Formatear la respuesta similar a como lo hacía TurnoService
    const turnoFormateado = {
      id: turno.id,
      horaSalida: turno.horaSalida.toISOString(),
      ruta: turno.ruta ? { id: turno.ruta.id, nombre: turno.ruta.nombre } : null,
      movil: { id: turno.automovil.id, movil: turno.automovil.movil },
      conductor: { id: turno.conductor.id, nombre: turno.conductor.nombre },
      estado: turno.estado || 'COMPLETADO'
    };

    return NextResponse.json({
      success: true,
      turno: turnoFormateado,
      message: 'Despacho asignado correctamente'
    });

  } catch (error) {
    console.error('Error asignando despacho:', error);

    // Manejar errores específicos
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}