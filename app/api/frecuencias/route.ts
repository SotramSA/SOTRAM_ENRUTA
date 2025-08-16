import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { calcularFrecuenciasMultiples, calcularTiempoRetraso, obtenerSiguienteRutaPrioritaria } from '@/src/lib/ejemploFrecuencia';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const horaSalidaParam = searchParams.get('horaSalida');
    
    if (!horaSalidaParam) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro horaSalida' },
        { status: 400 }
      );
    }

    // Obtener todas las rutas activas
    const rutas = await prisma.ruta.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        frecuenciaMin: true,
        frecuenciaMax: true,
        frecuenciaDefault: true,
        prioridad: true
      }
    });

    // Calcular tiempo de retraso
    const horaSalida = new Date(horaSalidaParam);
    const horaActual = new Date();
    const tiempoRetraso = calcularTiempoRetraso(horaSalida, horaActual);

    // Calcular frecuencias
    const frecuenciasCalculadas = calcularFrecuenciasMultiples(rutas, tiempoRetraso);

    // Combinar datos de rutas con frecuencias calculadas
    const resultado = frecuenciasCalculadas.map(({ id, frecuencia }) => {
      const ruta = rutas.find(r => r.id === id);
      return {
        ...ruta,
        frecuenciaCalculada: frecuencia,
        tiempoRetraso
      };
    });

    return NextResponse.json({
      tiempoRetraso,
      rutas: resultado
    });

  } catch (error) {
    console.error('Error al calcular frecuencias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { horaSalida, rutaId, ultimaRutaEnviada } = body;

    if (!horaSalida) {
      return NextResponse.json(
        { error: 'Se requiere horaSalida' },
        { status: 400 }
      );
    }

    // Obtener todas las rutas activas
    const rutas = await prisma.ruta.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        frecuenciaMin: true,
        frecuenciaMax: true,
        frecuenciaDefault: true,
        prioridad: true
      }
    });

    // Calcular tiempo de retraso
    const horaSalidaDate = new Date(horaSalida);
    const horaActual = new Date();
    const tiempoRetraso = calcularTiempoRetraso(horaSalidaDate, horaActual);

    // Obtener rutas prioritarias
    const rutasPrioritarias = rutas.filter(ruta => ruta.prioridad);

    // Si se solicita una ruta específica
    if (rutaId) {
      const ruta = rutas.find(r => r.id === parseInt(rutaId));
      if (!ruta) {
        return NextResponse.json(
          { error: 'Ruta no encontrada' },
          { status: 404 }
        );
      }

      const frecuenciasCalculadas = calcularFrecuenciasMultiples([ruta], tiempoRetraso);
      const frecuenciaCalculada = frecuenciasCalculadas[0];

      return NextResponse.json({
        ruta: {
          ...ruta,
          frecuenciaCalculada: frecuenciaCalculada.frecuencia,
          tiempoRetraso
        },
        totalRutasPrioritarias: rutasPrioritarias.length
      });
    }

    // Si se solicita la siguiente ruta prioritaria
    if (ultimaRutaEnviada !== undefined) {
      const siguienteRutaId = obtenerSiguienteRutaPrioritaria(rutasPrioritarias, ultimaRutaEnviada);
      
      if (!siguienteRutaId) {
        return NextResponse.json({
          siguienteRuta: null,
          tiempoRetraso
        });
      }

      const siguienteRuta = rutas.find(r => r.id === siguienteRutaId);
      const frecuenciasCalculadas = calcularFrecuenciasMultiples([siguienteRuta!], tiempoRetraso);
      const frecuenciaCalculada = frecuenciasCalculadas[0];

      return NextResponse.json({
        siguienteRuta: {
          ...siguienteRuta,
          frecuenciaCalculada: frecuenciaCalculada.frecuencia
        },
        tiempoRetraso
      });
    }

    // Si no se especifica rutaId ni ultimaRutaEnviada, devolver todas las frecuencias
    const frecuenciasCalculadas = calcularFrecuenciasMultiples(rutas, tiempoRetraso);
    const resultado = frecuenciasCalculadas.map(({ id, frecuencia }) => {
      const ruta = rutas.find(r => r.id === id);
      return {
        ...ruta,
        frecuenciaCalculada: frecuencia
      };
    });

    return NextResponse.json({
      tiempoRetraso,
      rutas: resultado
    });

  } catch (error) {
    console.error('Error al calcular frecuencia:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}