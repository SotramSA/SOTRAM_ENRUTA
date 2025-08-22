import { NextRequest, NextResponse } from 'next/server'

// Configuración temporal para evitar errores de build
export async function GET(request: NextRequest) {
  try {
    // Intentar importar dinámicamente para evitar errores de build
    const { handlers } = await import('@/auth')
    return handlers.GET(request)
  } catch (error) {
    console.error('Error en GET auth:', error)
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Intentar importar dinámicamente para evitar errores de build
    const { handlers } = await import('@/auth')
    return handlers.POST(request)
  } catch (error) {
    console.error('Error en POST auth:', error)
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 })
  }
}
