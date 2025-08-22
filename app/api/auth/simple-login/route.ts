import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { usuario, password } = await request.json()

    if (!usuario || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Buscar usuario en la base de datos
    const user = await prisma.usuario.findFirst({
      where: {
        usuario: usuario,
        activo: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 401 }
      )
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password!)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      )
    }

    // Crear JWT token
    const token = jwt.sign(
      {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        activo: user.activo,
        tablaConductor: user.tablaConductor,
        tablaAutomovil: user.tablaAutomovil,
        tablaRuta: user.tablaRuta,
        tablaConductorAutomovil: user.tablaConductorAutomovil,
        tablaTurno: user.tablaTurno,
        tablaPlanilla: user.tablaPlanilla,
        tablaSancionConductor: user.tablaSancionConductor,
        tablaSancionAutomovil: user.tablaSancionAutomovil,
        tablaFecha: user.tablaFecha,
        tablaUsuario: user.tablaUsuario,
        tablaConfiguracion: user.tablaConfiguracion,
        tablaInformes: user.tablaInformes,
        tablaPropietarios: user.tablaPropietarios,
        tablaProgramada: user.tablaProgramada
      },
      process.env.NEXTAUTH_SECRET || 'default-secret',
      { expiresIn: '7d' }
    )

    console.log('Usuario autenticado exitosamente:', user.usuario)

    // Crear respuesta con cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre
      }
    })

    // Establecer cookie de sesión (compatible con RouteGuard)
    response.cookies.set('session', JSON.stringify({
      id: user.id,
      nombre: user.nombre,
      usuario: user.usuario,
      activo: user.activo,
      tablaConductor: user.tablaConductor,
      tablaAutomovil: user.tablaAutomovil,
      tablaRuta: user.tablaRuta,
      tablaConductorAutomovil: user.tablaConductorAutomovil,
      tablaTurno: user.tablaTurno,
      tablaPlanilla: user.tablaPlanilla,
      tablaSancionConductor: user.tablaSancionConductor,
      tablaSancionAutomovil: user.tablaSancionAutomovil,
      tablaFecha: user.tablaFecha,
      tablaUsuario: user.tablaUsuario,
      tablaConfiguracion: user.tablaConfiguracion,
      tablaInformes: user.tablaInformes,
      tablaPropietarios: user.tablaPropietarios,
      tablaProgramada: user.tablaProgramada
    }), {
      httpOnly: false, // Cambiado a false para que el cliente pueda leerlo
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Error en simple login:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
