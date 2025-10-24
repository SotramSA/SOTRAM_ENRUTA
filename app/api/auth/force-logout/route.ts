import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Eliminar la cookie de sesión con múltiples configuraciones para asegurar eliminación
    cookieStore.delete('session')
    
    // También intentar eliminar con diferentes configuraciones
    cookieStore.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expira inmediatamente
      expires: new Date(0) // Fecha en el pasado
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Sesión eliminada completamente',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error en force-logout:', error)
    return NextResponse.json({ 
      error: 'Error al cerrar sesión',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function GET() {
  // También permitir GET para facilitar el acceso desde el navegador
  return POST()
}