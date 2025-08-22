import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // Obtener token de las cookies
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(null, { status: 200 })
    }

    // Verificar token
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'default-secret'
    ) as any

    return NextResponse.json({
      user: {
        id: decoded.id,
        usuario: decoded.usuario,
        nombre: decoded.nombre,
        activo: decoded.activo,
        tablaConductor: decoded.tablaConductor,
        tablaAutomovil: decoded.tablaAutomovil,
        tablaRuta: decoded.tablaRuta,
        tablaConductorAutomovil: decoded.tablaConductorAutomovil,
        tablaTurno: decoded.tablaTurno,
        tablaPlanilla: decoded.tablaPlanilla,
        tablaSancionConductor: decoded.tablaSancionConductor,
        tablaSancionAutomovil: decoded.tablaSancionAutomovil,
        tablaFecha: decoded.tablaFecha,
        tablaUsuario: decoded.tablaUsuario,
        tablaConfiguracion: decoded.tablaConfiguracion,
        tablaInformes: decoded.tablaInformes,
        tablaPropietarios: decoded.tablaPropietarios,
        tablaProgramada: decoded.tablaProgramada
      }
    })

  } catch (error) {
    console.error('Error verificando token:', error)
    return NextResponse.json(null, { status: 200 })
  }
}
