import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    const body = await request.json()
    const {
      nombre,
      usuario,
      password,
      activo,
      tablaConductor,
      tablaAutomovil,
      tablaUsuario,
      tablaRuta,
      tablaConductorAutomovil,
      tablaTurno,
      tablaPlanilla,
      tablaSancionConductor,
      tablaSancionAutomovil,
      tablaFecha,
      tablaInformes,
      tablaPropietarios,
      tablaProgramada
    } = body

    // Verificar si el usuario existe
    const existingUser = await prisma.usuario.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si el nuevo nombre de usuario ya existe (excluyendo el usuario actual)
    if (usuario !== existingUser.usuario) {
      const userWithSameUsername = await prisma.usuario.findFirst({
        where: { usuario }
      })

      if (userWithSameUsername) {
        return NextResponse.json(
          { error: 'El nombre de usuario ya existe' },
          { status: 400 }
        )
      }
    }

    // Preparar datos de actualización
    const updateData: any = {
      nombre: nombre || '',
      usuario: usuario || '',
      activo: activo !== undefined ? activo : true,
      tablaConductor: tablaConductor !== undefined ? tablaConductor : false,
      tablaAutomovil: tablaAutomovil !== undefined ? tablaAutomovil : false,
      tablaUsuario: tablaUsuario !== undefined ? tablaUsuario : false,
      tablaRuta: tablaRuta !== undefined ? tablaRuta : false,
      tablaConductorAutomovil: tablaConductorAutomovil !== undefined ? tablaConductorAutomovil : false,
      tablaTurno: tablaTurno !== undefined ? tablaTurno : false,
      tablaPlanilla: tablaPlanilla !== undefined ? tablaPlanilla : false,
      tablaSancionConductor: tablaSancionConductor !== undefined ? tablaSancionConductor : false,
      tablaSancionAutomovil: tablaSancionAutomovil !== undefined ? tablaSancionAutomovil : false,
      tablaFecha: tablaFecha !== undefined ? tablaFecha : false,
      tablaInformes: tablaInformes !== undefined ? tablaInformes : false,
      tablaPropietarios: tablaPropietarios !== undefined ? tablaPropietarios : false,
      tablaProgramada: tablaProgramada !== undefined ? tablaProgramada : false
    }

    // Solo actualizar contraseña si se proporciona una nueva
    if (password && typeof password === 'string' && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const updatedUsuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
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
        tablaProgramada: true,
        tablaPropietarios: true
      }
    })

    return NextResponse.json(updatedUsuario)
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    console.error('Detalles del error:', {
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    // Verificar si el usuario existe
    const existingUser = await prisma.usuario.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar el usuario
    await prisma.usuario.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Usuario eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    console.error('Detalles del error:', {
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 