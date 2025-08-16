import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    const where = search ? {
      OR: [
        { nombre: { contains: search } },
        { usuario: { contains: search } }
      ]
    } : {}

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          nombre: true,
          usuario: true,
          activo: true,
          tablaConductor: true,
          tablaAutomovil: true,
          tablaUsuario: true,
          tablaRuta: true,
          tablaConductorAutomovil: true,
          tablaTurno: true,
          tablaPlanilla: true,
          tablaSancionConductor: true,
          tablaSancionAutomovil: true,
          tablaFecha: true,
          tablaInformes: true,
          tablaPropietarios: true,
          tablaProgramada: true
        },
        orderBy: [
          { activo: 'desc' },
          { nombre: 'asc' }
        ]
      }),
      prisma.usuario.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      usuarios,
      total,
      totalPages,
      page,
      limit
    })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar campos requeridos
    if (!body.nombre || !body.usuario || !body.password) {
      return NextResponse.json(
        { error: 'Nombre, usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const {
      nombre,
      usuario,
      password,
      activo = true,
      tablaConductor = false,
      tablaAutomovil = false,
      tablaUsuario = false,
      tablaRuta = false,
      tablaConductorAutomovil = false,
      tablaTurno = false,
      tablaPlanilla = false,
      tablaSancionConductor = false,
      tablaSancionAutomovil = false,
      tablaFecha = false,
      tablaInformes = false,
      tablaPropietarios = false,
      tablaProgramada = false
    } = body

    // Verificar si el usuario ya existe
    const existingUser = await prisma.usuario.findFirst({
      where: { usuario }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya existe' },
        { status: 400 }
      )
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario
    const newUsuario = await prisma.usuario.create({
      data: {
        nombre: nombre.toString(),
        usuario: usuario.toString(),
        password: hashedPassword,
        activo: Boolean(activo),
        tablaConductor: Boolean(tablaConductor),
        tablaAutomovil: Boolean(tablaAutomovil),
        tablaUsuario: Boolean(tablaUsuario),
        tablaRuta: Boolean(tablaRuta),
        tablaConductorAutomovil: Boolean(tablaConductorAutomovil),
        tablaTurno: Boolean(tablaTurno),
        tablaPlanilla: Boolean(tablaPlanilla),
        tablaSancionConductor: Boolean(tablaSancionConductor),
        tablaSancionAutomovil: Boolean(tablaSancionAutomovil),
        tablaFecha: Boolean(tablaFecha),
        tablaInformes: Boolean(tablaInformes),
        tablaPropietarios: Boolean(tablaPropietarios),
        tablaProgramada: Boolean(tablaProgramada)
      },
      select: {
        id: true,
        nombre: true,
        usuario: true,
        activo: true,
        tablaConductor: true,
        tablaAutomovil: true,
        tablaUsuario: true,
        tablaRuta: true,
        tablaConductorAutomovil: true,
        tablaTurno: true,
        tablaPlanilla: true,
        tablaSancionConductor: true,
        tablaSancionAutomovil: true,
        tablaFecha: true,
        tablaInformes: true,
        tablaPropietarios: true,
        tablaProgramada: true
      }
    })

    return NextResponse.json(newUsuario, { status: 201 })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 