import { NextRequest, NextResponse } from 'next/server'

// Cierra sesión eliminando la cookie personalizada `session`
export async function GET(request: NextRequest) {
  const redirectUrl = new URL('/login', request.url)

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}

export async function POST(request: NextRequest) {
  // Permite también cerrar sesión vía POST por si se invoca programáticamente
  const redirectUrl = new URL('/login', request.url)

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
}


