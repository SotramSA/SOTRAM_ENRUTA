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

    // Preparar datos de sesión y crear respuesta con cookie
    const sessionData = {
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
      tablaProgramada: user.tablaProgramada,
      tablaInspeccion: user.tablaInspeccion
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre
      },
      sessionData
    })

    // Detectar si la conexión es HTTPS para configurar correctamente el atributo secure
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const urlProto = request.nextUrl.protocol.replace(':', '').toLowerCase()
    const hostHeader = (request.headers.get('host') || '').toLowerCase()
    const hostname = request.nextUrl.hostname.toLowerCase()
    const isPrivateHost = (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      // Rango 172.16.0.0 – 172.31.255.255
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    )
    // Simplificar: solo considerar HTTPS real del request URL y nunca marcar secure en hosts privados
    const isHttps = (!isPrivateHost) && (urlProto === 'https')

    // Logs de depuración para confirmar la decisión
    console.log('[simple-login] host=%s, proto=%s, fwdProto=%s, isPrivate=%s, isHttps=%s', hostname, urlProto, forwardedProto, isPrivateHost, isHttps)

    // Establecer cookie de sesión (compatible con RouteGuard)
    response.cookies.set('session', JSON.stringify(sessionData), {
      httpOnly: false, // Permitir lectura en cliente por RouteGuard/SessionChecker
      secure: false, // Forzado para entorno LAN HTTP; evitamos rechazos del navegador
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 horas
      path: '/'
    })

    // Adjuntar headers de depuración para ver decisión en DevTools
    response.headers.set('x-cookie-secure', String(isHttps))
    response.headers.set('x-cookie-host', hostname)
    response.headers.set('x-cookie-url-proto', urlProto)
    if (forwardedProto) {
      response.headers.set('x-cookie-fwd-proto', forwardedProto)
    }

    // Cookie de depuración adicional para verificar atributos en el browser
    response.cookies.set('session_dbg', '1', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutos solo para ver comportamiento
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
