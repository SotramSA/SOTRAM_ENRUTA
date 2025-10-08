import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { isoToTimeHHMM } from '@/src/lib/utils';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const programadoId = parseInt(id);

    if (isNaN(programadoId)) {
      return NextResponse.json({ error: 'ID de programado inválido' }, { status: 400 });
    }

    // Obtener parámetros adicionales para personalizar el recibo
    const { searchParams } = new URL(request.url);
    const movilNumero = searchParams.get('movil');
    const conductorId = searchParams.get('conductorId');
    const conductorNombre = searchParams.get('conductorNombre');
    const movilOriginal = searchParams.get('movilOriginal');
    const horaSalidaISO = searchParams.get('horaSalidaISO');

     // Obtener el usuario actual desde la sesión
     const cookieStore = await cookies();
     const sessionCookie = cookieStore.get('session');
     
         let usuarioActual = 'Sistema';
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        usuarioActual = sessionData?.nombre || 'Sistema';
      } catch (error) {
        console.error('⚠️ Error al parsear sesión:', error);
      }
    }

          // Obtener el programado con todas las relaciones necesarias
     const programado = await prisma.programacion.findUnique({
       where: { id: programadoId },
       include: {
         automovil: true,
         ruta: true
       }
     });

    

    if (!programado) {
      return NextResponse.json({ error: 'Programado no encontrado' }, { status: 404 });
    }

    // Determinar la hora de salida segura en HH:mm
    let horaFormateada = '';
    if (horaSalidaISO) {
      // Priorizar hora llegada como ISO, usando UTC HH:mm
      horaFormateada = isoToTimeHHMM(horaSalidaISO);
    } else {
      // Formatear la hora desde el campo numérico del programado
      const hora = programado.hora;
      if (typeof hora === 'number') {
        const horas = Math.floor(hora / 100);
        const minutos = hora % 100;
        horaFormateada = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
      } else {
        horaFormateada = String(hora);
      }
    }

    // Obtener zona horaria desde variables de entorno o usar Colombia por defecto
    const zonaHoraria = process.env.TIMEZONE || 'America/Bogota';

    // Formatear la fecha del programado sin afectar por zona horaria
    // Extraer la parte de fecha (YYYY-MM-DD) del ISO y construir la salida manualmente
    const fechaISO = (programado.fecha instanceof Date
      ? programado.fecha.toISOString()
      : new Date(programado.fecha).toISOString()).slice(0, 10);
    const [yearStr, monthStr, dayStr] = fechaISO.split('-');
    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const dayNum = parseInt(dayStr, 10);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const fechaFormateada = `${dayNum} de ${meses[monthNum - 1]} de ${yearNum}`;

    // Obtener la fecha y hora de registro (momento de emisión del recibo) en zona horaria configurada
    const ahora = new Date();
    const fechaRegistro = ahora.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: zonaHoraria
    });
    const horaRegistro = ahora.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: zonaHoraria
    });

    // Determinar datos del móvil y conductor según los parámetros
    let movilFinal = movilNumero || programado.automovil?.movil || 'Sin móvil';
    let conductorFinal = conductorNombre || 'Programado';
    let placaFinal = programado.automovil?.placa || 'falta por placa';
    
    // Si el móvil cambió, necesitamos obtener la placa del nuevo móvil
    if (movilNumero && movilNumero !== programado.automovil?.movil) {
      try {
        const nuevoMovil = await prisma.automovil.findFirst({
          where: { movil: movilNumero }
        });
        if (nuevoMovil) {
          placaFinal = nuevoMovil.placa || 'falta por placa';
        }
      } catch (error) {
        console.error('⚠️ Error al obtener placa del nuevo móvil:', error);
      }
    }

    const reciboData = {
      id: programado.id,
      horaSalida: horaFormateada,
      fechaSalida: fechaFormateada,
      ruta: programado.ruta?.nombre || 'Sin ruta',
      movil: movilFinal,
      placa: placaFinal,
      conductor: conductorFinal,
      despachadoPor: usuarioActual,
      registro: `${fechaRegistro} ${horaRegistro}`,
      tipo: 'programado',
      // Campos adicionales para casos de sustitución
      movilOriginal: movilOriginal, // Solo si es diferente
      esSustitucion: !!movilOriginal // Indica si es una sustitución
    };

    // Actualizar los campos realizoPorId y realizadoPorConductorId en la base de datos
    let nuevoEstado = programado.estado;
    
    if (movilNumero && conductorId) {
      try {
        // Buscar el automóvil por número de móvil para obtener su ID
        const automovilRealizado = await prisma.automovil.findFirst({
          where: { movil: movilNumero }
        });

        if (automovilRealizado) {
          // Determinar el nuevo estado
          if (automovilRealizado.id === programado.automovilId) {
            // Mismo móvil asignado
            nuevoEstado = 'COMPLETADO';
          } else {
            // Móvil diferente
            nuevoEstado = `COMPLETADO POR ${movilNumero}`;
          }

          // Actualizar la programación en la base de datos
          await prisma.programacion.update({
            where: { id: programadoId },
            data: {
              realizadoPorId: automovilRealizado.id,
              realizadoPorConductorId: parseInt(conductorId),
              estado: nuevoEstado
            }
          });

          // Programación actualizada correctamente
        }
      } catch (error) {
        console.error('⚠️ Error al actualizar programación:', error);
      }
    }

    return NextResponse.json(reciboData);

  } catch (error) {
    console.error('❌ Error generando recibo de programado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
