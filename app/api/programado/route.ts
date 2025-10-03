import prismaWithRetry from '@/lib/prismaClient'
import { NextRequest, NextResponse } from 'next/server'

// Definición de rutas especiales para mapeo
const RUTAS_ESPECIALES = {
  'DESPACHO D. RUT7 CORZO LORETO': [
    '04:50', '04:57', '05:04', '05:11'
  ],
  'DESPACHO E RUT7 CORZO': [
    '04:55', '05:05', '05:15'
  ],
  'DESPACHO D RUT4 PAMPA-CORZO': [
    '04:50', '05:00', '05:10'
  ]
}

// Función para determinar si una hora pertenece a una ruta especial
function getRutaEspecialByHora(hora: number, rutaBase: string): string {
  const horaStr = `${Math.floor(hora / 100).toString().padStart(2, '0')}:${(hora % 100).toString().padStart(2, '0')}`
  
  // Si la ruta ya es una ruta especial (D o E), NO la mapear - dejarla como está
  if (rutaBase && (rutaBase.includes('DESPACHO D') || rutaBase.includes('DESPACHO E'))) {
    return rutaBase
  }
  
  // Solo aplicar mapeo para programaciones que usan Despacho A como base
  if (rutaBase === 'Despacho A') {
    for (const [rutaEspecial, horarios] of Object.entries(RUTAS_ESPECIALES)) {
      if (horarios.includes(horaStr)) {
        return rutaEspecial
      }
    }
  }
  
  return rutaBase
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha')

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    }

    // Removed noisy debug logging for production stability

    const programaciones = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.programacion.findMany({
        where: {
          fecha: new Date(fecha)
        },
        include: {
          automovil: {
            select: {
              id: true,
              movil: true,
              placa: true
            }
          },
          ruta: {
            select: {
              id: true,
              nombre: true
            }
          }
        },
        orderBy: [
          { hora: 'asc' },
          { rutaId: 'asc' }
        ]
      });
    });

    // Removed noisy debug logging for programaciones content

    // Contar por ruta raw
    const conteoPorRutaRaw: Record<string, number> = {}
    programaciones.forEach(p => {
      const rutaRaw = p.ruta?.nombre || 'Sin ruta'
      conteoPorRutaRaw[rutaRaw] = (conteoPorRutaRaw[rutaRaw] || 0) + 1
    })
    // Removed noisy debug logging for conteo por ruta

    // YA NO necesitamos mapear porque todas las rutas especiales están directamente en la BD
    // Removed noisy informational log for response size

    return NextResponse.json({
      programaciones: programaciones
    })
  } catch (error) {
    console.error('Error al obtener programaciones:', error)
    return NextResponse.json({ error: 'Error al obtener programaciones' }, { status: 500 })
  } finally {
    await prismaWithRetry.$disconnect();
  }
}
