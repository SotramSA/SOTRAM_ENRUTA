'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SessionChecker() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = () => {
      try {
        // Verificar si existe la cookie de sesión
        const hasSessionCookie = document.cookie.includes('session=')
        
        if (!hasSessionCookie) {
          console.log('SessionChecker: No session cookie found, redirecting to login')
          router.push('/login')
          return
        }

        // Obtener la cookie de sesión
        const cookies = document.cookie.split(';')
        const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('session='))

        if (sessionCookie) {
          try {
            const sessionValue = decodeURIComponent(sessionCookie.split('=')[1])
            const sessionData = JSON.parse(sessionValue)
            
            // Verificar si la sesión tiene datos válidos
            if (!sessionData || !sessionData.id) {
              console.log('SessionChecker: Invalid session data, redirecting to login')
              router.push('/login')
              return
            }
          } catch (parseError) {
            console.log('SessionChecker: Error parsing session, redirecting to login')
            router.push('/login')
            return
          }
        } else {
          console.log('SessionChecker: Session cookie not found, redirecting to login')
          router.push('/login')
        }
      } catch (error) {
        console.error('SessionChecker: Error checking session:', error)
        router.push('/login')
      }
    }

    // Verificar sesión cada 5 minutos
    const interval = setInterval(checkSession, 5 * 60 * 1000)
    
    // Verificar también al cargar el componente
    checkSession()

    return () => clearInterval(interval)
  }, [router])

  return null // Este componente no renderiza nada
}
