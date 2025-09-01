const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUserPermissions() {
  try {
    console.log('🔍 Verificando permisos de usuarios...')
    
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        usuario: true,
        nombre: true,
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

    console.log('\n📋 Permisos de usuarios:')
    users.forEach(user => {
      console.log(`\n👤 ${user.nombre} (${user.usuario}) - ${user.activo ? '✅ Activo' : '❌ Inactivo'}`)
      console.log(`   tablaConductor: ${user.tablaConductor ? '✅' : '❌'}`)
      console.log(`   tablaAutomovil: ${user.tablaAutomovil ? '✅' : '❌'}`)
      console.log(`   tablaRuta: ${user.tablaRuta ? '✅' : '❌'}`)
      console.log(`   tablaTurno: ${user.tablaTurno ? '✅' : '❌'}`)
      console.log(`   tablaPlanilla: ${user.tablaPlanilla ? '✅' : '❌'}`)
      console.log(`   tablaSancionConductor: ${user.tablaSancionConductor ? '✅' : '❌'}`)
      console.log(`   tablaSancionAutomovil: ${user.tablaSancionAutomovil ? '✅' : '❌'}`)
      console.log(`   tablaUsuario: ${user.tablaUsuario ? '✅' : '❌'}`)
      console.log(`   tablaConfiguracion: ${user.tablaConfiguracion ? '✅' : '❌'}`)
      console.log(`   tablaInformes: ${user.tablaInformes ? '✅' : '❌'}`)
      console.log(`   tablaPropietarios: ${user.tablaPropietarios ? '✅' : '❌'}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUserPermissions()
