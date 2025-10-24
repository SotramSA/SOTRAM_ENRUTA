import { cookies } from 'next/headers'

export interface SessionData {
  id: string
  nombre: string
  usuario: string
  activo: boolean
  tablaConductor: boolean
  tablaAutomovil: boolean
  tablaRuta: boolean
  tablaConductorAutomovil: boolean
  tablaTurno: boolean
  tablaPlanilla: boolean
  tablaSancionConductor: boolean
  tablaSancionAutomovil: boolean
  tablaFecha: boolean
  tablaUsuario: boolean
  tablaConfiguracion: boolean
  tablaInformes: boolean
  tablaPropietarios: boolean
  tablaProgramada: boolean
  tablaInspeccion: boolean
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return null
    }
    
    const sessionData = JSON.parse(sessionCookie.value) as SessionData
    
    if (!sessionData || !sessionData.id) {
      return null
    }
    
    return sessionData
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}
