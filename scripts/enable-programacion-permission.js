const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function enableProgramacionPermission() {
  try {
    // Habilitar tablaProgramada para todos los usuarios
    const updatedUsers = await prisma.usuario.updateMany({
      where: {},
      data: {
        tablaProgramada: true
      }
    })

    console.log('✅ Permiso de programación habilitado para todos los usuarios')
    console.log('Usuarios actualizados:', updatedUsers.count)

    // Mostrar estado actual de todos los usuarios
    const allUsers = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        usuario: true,
        tablaProgramada: true
      }
    })

    console.log('\n📋 Estado actual de todos los usuarios:')
    allUsers.forEach(user => {
      console.log(`- ${user.nombre} (${user.usuario}): tablaProgramada = ${user.tablaProgramada}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

enableProgramacionPermission()
