const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function testLoginProcess() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Simulando proceso de login...')
    
    // Buscar usuario como lo hace loginAction
    const user = await prisma.usuario.findFirst({
      where: { usuario: 'maicolrincon93' }
    })
    
    if (!user) {
      console.log('❌ Usuario no encontrado')
      return
    }
    
    console.log('✅ Usuario encontrado en DB')
    
    // Simular la creación del sessionData como en auth_action.ts
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
    
    console.log('\n📋 SessionData que se crearía:')
    console.log(JSON.stringify(sessionData, null, 2))
    
    console.log('\n🔍 Verificación específica de tablaInspeccion:')
    console.log('   En user DB:', user.tablaInspeccion)
    console.log('   En sessionData:', sessionData.tablaInspeccion)
    console.log('   Tipo en user:', typeof user.tablaInspeccion)
    console.log('   Tipo en session:', typeof sessionData.tablaInspeccion)
    
    // Simular JSON.stringify como se hace en la cookie
    const cookieValue = JSON.stringify(sessionData)
    console.log('\n🍪 Cookie value (primeros 200 chars):')
    console.log(cookieValue.substring(0, 200) + '...')
    
    // Simular JSON.parse como se hace en getSession
    const parsedSession = JSON.parse(cookieValue)
    console.log('\n🔄 Después de parse:')
    console.log('   tablaInspeccion:', parsedSession.tablaInspeccion)
    console.log('   Tipo:', typeof parsedSession.tablaInspeccion)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testLoginProcess()