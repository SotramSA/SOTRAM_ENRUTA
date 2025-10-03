import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface SessionUser {
  id: number;
  usuario: string;
  nombre: string;
  activo: boolean;
  tablaConductor: boolean;
  tablaAutomovil: boolean;
  tablaRuta: boolean;
  tablaConductorAutomovil: boolean;
  tablaTurno: boolean;
  tablaPlanilla: boolean;
  tablaSancionConductor: boolean;
  tablaSancionAutomovil: boolean;
  tablaFecha: boolean;
  tablaUsuario: boolean;
  tablaConfiguracion: boolean;
  tablaInformes: boolean;
  tablaPropietarios: boolean;
  tablaProgramada: boolean;
}

export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  try {
    // Obtener datos de sesión de las cookies
    const sessionData = request.cookies.get('session')?.value;
    
    

    if (!sessionData) {
      return null;
    }

    // Parsear los datos de sesión
    const session = JSON.parse(sessionData) as SessionUser;

    return session;
  } catch (error) {
    console.error('❌ Error parseando sesión:', error);
    return null;
  }
}
