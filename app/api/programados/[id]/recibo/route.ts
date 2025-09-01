import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
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
    const hora = programado.hora;
    if (typeof hora === 'number') {
      // Convertir la hora numérica a formato legible
      // Si hora = 800, significa 8:00 AM
      // Si hora = 1430, significa 2:30 PM
      const horas = Math.floor(hora / 100);
      const minutos = hora % 100;
      
      // Determinar si es AM o PM
      const esPM = horas >= 12;
      const horas12 = horas > 12 ? horas - 12 : (horas === 0 ? 12 : horas);
      
      horaFormateada = `${horas12.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')} ${esPM ? 'p. m.' : 'a. m.'}`;
    } else {
      // Fallback si la hora viene en otro formato
      horaFormateada = String(hora);
    }

    // Obtener zona horaria desde variables de entorno o usar Colombia por defecto
    const zonaHoraria = process.env.TIMEZONE || 'America/Bogota';
    
    // Formatear la fecha
    const fechaObj = new Date(programado.fecha);
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: zonaHoraria
    });

    // Obtener la fecha y hora de registro (cuando se creó el programado)
    const fechaRegistro = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: zonaHoraria
    });
    
    const horaRegistro = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: zonaHoraria
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
