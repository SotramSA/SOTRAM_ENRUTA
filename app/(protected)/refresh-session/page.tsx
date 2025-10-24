'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshSession() {
  const router = useRouter()
  const [status, setStatus] = useState('Iniciando proceso...')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const refreshSession = async () => {
      try {
        addLog('Iniciando proceso de logout forzado')
        setStatus('Cerrando sesión actual...')
        
        // Intentar con la nueva ruta de force-logout
        const response = await fetch('/api/auth/force-logout', {
          method: 'POST',
        })

        if (response.ok) {
          const result = await response.json()
          addLog(`Logout exitoso: ${result.message}`)
          setStatus('Sesión cerrada. Limpiando datos locales...')
          
          // Limpiar localStorage y sessionStorage
          if (typeof window !== 'undefined') {
            localStorage.clear()
            sessionStorage.clear()
            addLog('Datos locales limpiados')
          }
          
          setStatus('Redirigiendo al login...')
          addLog('Redirigiendo al login en 2 segundos...')
          
          // Esperar un poco más y redirigir
          setTimeout(() => {
            window.location.href = '/login'
          }, 2000)
        } else {
          const error = await response.json()
          addLog(`Error en logout: ${error.error}`)
          setStatus('Error al cerrar sesión. Redirigiendo de todas formas...')
          setTimeout(() => {
            window.location.href = '/login'
          }, 2000)
        }
      } catch (error) {
        console.error('Error:', error)
        addLog(`Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`)
        setStatus('Error de conexión. Redirigiendo al login...')
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      }
    }

    refreshSession()
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md w-full">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Actualizando sesión</h2>
        <p className="text-gray-600 mb-4">{status}</p>
        
        <div className="text-left bg-gray-100 p-3 rounded text-xs max-h-40 overflow-y-auto">
          <h3 className="font-semibold mb-2">Log del proceso:</h3>
          {logs.map((log, index) => (
            <div key={index} className="text-gray-700 mb-1">
              {log}
            </div>
          ))}
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          Esto es necesario para cargar los nuevos permisos
        </p>
      </div>
    </div>
  )
}