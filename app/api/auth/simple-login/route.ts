import { NextRequest, NextResponse } from 'next/server'
import prismaWithRetry from '@/lib/prismaClient'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { usuario, password } = await request.json()

    if (!usuario || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Buscar usuario en la base de datos con reintentos
    let user = await prismaWithRetry.executeWithRetry(async () => {
      return await prismaWithRetry.usuario.findFirst({
        where: {
          usuario: usuario,
          activo: true
        }
      })
    })

    // Si el usuario no existe y es maicolrincon93, crearlo
    if (!user && usuario === 'maicolrincon93' && password === '123456') {
      const hashedPassword = await bcrypt.hash('123456', 10)
      user = await prismaWithRetry.executeWithRetry(async () => {
        return await prismaWithRetry.usuario.create({
          data: {
            usuario: 'maicolrincon93',
            password: hashedPassword,
            nombre: 'Maicol Rincon',
            activo: true,
            tablaConductor: true,
            tablaAutomovil: true,
            tablaRuta: true,
            tablaConductorAutomovil: true,
            tablaTurno: true,
            tablaPlanilla: true,
            tablaSancionConductor: true,
            tablaSancionAutomovil: true,
            tablaFecha: true,
            tablaUsuario: true,
            tablaConfiguracion: true,
            tablaInformes: true,
            tablaPropietarios: true,
            tablaProgramada: true
          }
        })
      })
      console.log('✅ Usuario maicolrincon93 creado automáticamente')
    }

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
      { expiresIn: '8h' }
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
      maxAge: 8 * 60 * 60, // 8 horas
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
    await prismaWithRetry.$disconnect()
  }
}
