'use client'

import { useRouter } from 'next/navigation'
import { useEffect, ReactNode, useState } from 'react'

interface RouteGuardProps {
  children: ReactNode
  requiredPermission: string
}

export default function RouteGuard({ children, requiredPermission }: RouteGuardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    // Verificar si hay una cookie de sesión en el cliente
    const checkSession = () => {
      try {
        console.log('RouteGuard: Checking session for permission:', requiredPermission)
        console.log('RouteGuard: All cookies:', document.cookie)

        // Verificar si existe la cookie de sesión simple
        const hasSessionCookie = document.cookie.includes('session=')

        if (!hasSessionCookie) {
          console.log('RouteGuard: No session cookie found, redirecting to login')
          router.push('/login')
          return
        }

        // Obtener y verificar la sesión
        const cookies = document.cookie.split(';')
        const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('session='))

        console.log('RouteGuard: Found session cookie:', sessionCookie)

        if (sessionCookie) {
          try {
            const sessionValue = decodeURIComponent(sessionCookie.split('=')[1])
            console.log('RouteGuard: Session value:', sessionValue)

            const sessionData = JSON.parse(sessionValue)
            console.log('RouteGuard: Parsed session data:', sessionData)

            // Verificar si el usuario tiene el permiso requerido
            if (sessionData[requiredPermission]) {
              console.log('RouteGuard: User has permission, allowing access')
              setHasPermission(true)
            } else {
              console.log(`RouteGuard: User doesn't have permission: ${requiredPermission}, redirecting to admin`)
              router.push('/admin') // Redirigir a admin si no tiene permisos específicos
            }
          } catch (parseError) {
            console.error('RouteGuard: Error parsing session:', parseError)
            router.push('/login')
          }
        }

        setIsLoading(false)

      } catch (error) {
        console.error('RouteGuard: Error checking session:', error)
        router.push('/login')
      }
    }
    
    checkSession()
  }, [router, requiredPermission])

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full" role="status">
            <span className="sr-only">Cargando...</span>
          </div>
          <p className="mt-2">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Si no tiene permisos, redirigir
  if (!hasPermission) {
    return null
  }

  // Renderizar los children si todo está bien
  return <>{children}</>
}