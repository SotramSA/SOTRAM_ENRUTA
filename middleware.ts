import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = [
  '/login',
  '/register',
  '/listachequeo',
  '/consultarprogramado',
  '/api/automoviles/buscar',
  '/api/listachequeo',
  '/api/programacion/consultar',
  '/api/dashboard',
  '/api/auth'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Permitir acceso a rutas públicas
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Verificar si hay una sesión válida
  const sessionCookie = request.cookies.get('session')
  
  // Si no hay cookie de sesión y no es una ruta pública, redirigir a login
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Verificar que la sesión sea válida
  try {
    const sessionData = JSON.parse(sessionCookie.value)
    if (!sessionData || !sessionData.id) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } catch (error) {
    // Si hay error al parsear la cookie, redirigir a login
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}