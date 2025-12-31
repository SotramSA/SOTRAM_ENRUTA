import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
 

export async function POST(request: NextRequest) {
  try {
    const { permission } = await request.json()
    
    if (!permission) {
      return NextResponse.json({ error: 'Permiso requerido no especificado' }, { status: 400 })
    }

    // Obtener la cookie de sesión
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 })
    }

    let sessionData
    const rawValue = sessionCookie.value
    try {
      sessionData = JSON.parse(rawValue)
    } catch (e1) {
      try {
        sessionData = JSON.parse(decodeURIComponent(rawValue))
      } catch (e2) {
        return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
      }
    }

    // Verificar que la sesión contenga los datos necesarios
    if (!sessionData || !sessionData.id) {
      return NextResponse.json({ error: 'Datos de sesión incompletos' }, { status: 401 })
    }

    // Verificar si el usuario está activo
    if (!sessionData.activo) {
      return NextResponse.json({ error: 'Usuario inactivo' }, { status: 401 })
    }

    // Verificar si el usuario tiene el permiso requerido directamente desde la sesión
    const hasPermission = sessionData[permission] === true

    return NextResponse.json({ 
      hasPermission,
      user: {
        id: sessionData.id,
        usuario: sessionData.usuario
      }
    })

  } catch (error) {
    console.error('Error verificando permisos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
