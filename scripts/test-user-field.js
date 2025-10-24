const { PrismaClient } = require('@prisma/client')

async function testUserField() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Verificando campo tablaInspeccion...')
    
    const user = await prisma.usuario.findFirst({
      where: { usuario: 'maicolrincon93' }
    })
    
    if (!user) {
      console.log('❌ Usuario no encontrado')
      return
    }
    
    console.log('✅ Usuario encontrado:')
    console.log('   ID:', user.id)
    console.log('   Nombre:', user.nombre)
    console.log('   Usuario:', user.usuario)
    
    console.log('\n🔍 Verificando campo tablaInspeccion:')
    console.log('   Campo existe:', 'tablaInspeccion' in user)
    console.log('   Valor:', user.tablaInspeccion)
    console.log('   Tipo:', typeof user.tablaInspeccion)
    
    console.log('\n📋 Todos los campos del usuario:')
    Object.keys(user).forEach(key => {
      console.log(`   ${key}: ${user[key]}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testUserField()