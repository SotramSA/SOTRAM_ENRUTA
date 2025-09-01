import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const programadoId = parseInt(params.id);

    if (isNaN(programadoId)) {
      return NextResponse.json({ error: 'ID de programado inválido' }, { status: 400 });
    }

         console.log('🖨️ Generando recibo para programado:', programadoId);

     // Obtener el usuario actual desde la sesión
     const cookieStore = await cookies();
     const sessionCookie = cookieStore.get('session');
     
     let usuarioActual = 'Sistema';
     if (sessionCookie) {
       try {
         const sessionData = JSON.parse(decodeURIComponent(sessionCookie.value));
         usuarioActual = sessionData.user?.nombre || 'Sistema';
         console.log('👤 Usuario actual:', usuarioActual);
       } catch (error) {
         console.log('⚠️ Error al parsear sesión:', error);
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
      console.log('❌ Programado no encontrado:', programadoId);
      return NextResponse.json({ error: 'Programado no encontrado' }, { status: 404 });
    }

    console.log('✅ Programado encontrado:', {
      id: programado.id,
      fecha: programado.fecha,
      hora: programado.hora,
      ruta: programado.ruta?.nombre,
      automovil: programado.automovil.movil
    });

    // Formatear la hora desde el campo numérico
    let horaFormateada = '';
    if (typeof programado.hora === 'number') {
      const horas = Math.floor(programado.hora / 100);
      const minutos = programado.hora % 100;
      horaFormateada = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')} a. m.`;
    } else {
      // Fallback si la hora viene en otro formato
      horaFormateada = programado.hora.toString();
    }

    // Formatear la fecha
    const fechaObj = new Date(programado.fecha);
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });

    // Obtener la fecha y hora de registro (cuando se creó el programado)
    const fechaRegistro = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const horaRegistro = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const reciboData = {
      id: programado.id,
      horaSalida: horaFormateada,
      fechaSalida: fechaFormateada,
      ruta: programado.ruta?.nombre || 'Sin ruta',
      movil: programado.automovil.movil,
      placa: programado.automovil.placa || 'falta por placa',
      conductor: 'Programado', // Los programados no tienen conductor específico
             despachadoPor: usuarioActual,
      registro: `${fechaRegistro} ${horaRegistro}`,
      tipo: 'programado'
    };

    console.log('📄 Datos del recibo generados:', reciboData);

    return NextResponse.json(reciboData);

  } catch (error) {
    console.error('❌ Error generando recibo de programado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
