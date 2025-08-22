import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/listachequeo',
  '/listachequeo/todos',
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
  
  // Verificar si hay una sesión válida de NextAuth
  const nextAuthCookie = request.cookies.get('next-auth.session-token') || 
                        request.cookies.get('__Secure-next-auth.session-token')
  
  // Si no hay cookie de NextAuth y no es una ruta pública, redirigir a login
  if (!nextAuthCookie) {
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