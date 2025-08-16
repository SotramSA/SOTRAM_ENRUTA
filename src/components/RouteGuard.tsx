'use client'

import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface RouteGuardProps {
  children: ReactNode
  requiredPermission: string
}

export default function RouteGuard({ children, requiredPermission }: RouteGuardProps) {
  const router = useRouter()

  useEffect(() => {
    // Verificar si hay una cookie de sesión
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/check-session', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (!response.ok) {
          router.push('/login')
          return
        }
        
        const sessionData = await response.json()
        
        if (!sessionData || !sessionData[requiredPermission]) {
          router.push('/admin')
          return
        }
      } catch (error) {
        console.error('Error checking session:', error)
        router.push('/login')
      }
    }
    
    checkSession()
  }, [router, requiredPermission])

  // Por ahora, renderizar los children y dejar que el middleware maneje la protección
  return <>{children}</>
}