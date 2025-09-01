'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
}

const routePermissions: Record<string, string> = {
  '/turno': 'tablaTurno',
  '/turnos': 'tablaTurno',
  '/conductores': 'tablaConductor',
  '/automoviles': 'tablaAutomovil',
  '/rutas': 'tablaRuta',
  '/planillas': 'tablaPlanilla',
  '/sancionConductor': 'tablaSancionConductor',
  '/sancionAutomovil': 'tablaSancionAutomovil',
  '/configuracion': 'tablaConfiguracion',
  '/informes': 'tablaInformes',
  '/propietarios': 'tablaPropietarios',
  '/usuarios': 'tablaUsuario',
  '/programado': 'tablaProgramada',
  '/admin': 'tablaUsuario',
}

export default function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Determinar el permiso requerido
        const permission = requiredPermission || routePermissions[pathname]
        
        if (!permission) {
          // Si no hay permiso específico, permitir acceso
          setIsAuthorized(true)
          setIsLoading(false)
          return
        }

        // Verificar permisos con la API
        const response = await fetch('/api/auth/check-permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ permission })
        })

        if (response.ok) {
          const { hasPermission } = await response.json()
          setIsAuthorized(hasPermission)
        } else {
          setIsAuthorized(false)
        }
      } catch (error) {
        console.error('Error verificando permisos:', error)
        setIsAuthorized(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkPermissions()
  }, [pathname, requiredPermission])

  useEffect(() => {
    if (!isLoading && !isAuthorized) {
      // Redirigir a dashboard con mensaje de error
      router.push('/dashboard?error=no-permission')
    }
  }, [isLoading, isAuthorized, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
