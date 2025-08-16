const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setupProgramacionPropietarios() {
  try {
    console.log('🔧 Configurando propietarios para el sistema de programación...')

    // Obtener todos los propietarios
    const propietarios = await prisma.propietario.findMany({
      select: {
        id: true,
        nombre: true,
        cedula: true
      }
    })

    console.log(`📋 Encontrados ${propietarios.length} propietarios:`)
    propietarios.forEach(prop => {
      console.log(`- ${prop.nombre} (${prop.cedula})`)
    })

    // Obtener todos los automóviles
    const automoviles = await prisma.automovil.findMany({
      select: {
        id: true,
        movil: true,
        placa: true,
        propietarioId: true
      }
    })

    console.log(`\n🚗 Encontrados ${automoviles.length} automóviles:`)
    automoviles.forEach(auto => {
      console.log(`- Móvil ${auto.movil} (${auto.placa}) - Propietario ID: ${auto.propietarioId || 'Sin propietario'}`)
    })

    // Asignar propietarios a algunos automóviles si no tienen
    const automovilesSinPropietario = automoviles.filter(auto => !auto.propietarioId)
    
    if (automovilesSinPropietario.length > 0 && propietarios.length > 0) {
      console.log(`\n🔗 Asignando propietarios a ${automovilesSinPropietario.length} automóviles...`)
      
      for (let i = 0; i < automovilesSinPropietario.length; i++) {
        const propietarioIndex = i % propietarios.length
        const propietario = propietarios[propietarioIndex]
        const automovil = automovilesSinPropietario[i]
        
        await prisma.automovil.update({
          where: { id: automovil.id },
          data: { propietarioId: propietario.id }
        })
        
        console.log(`✅ Móvil ${automovil.movil} asignado a ${propietario.nombre}`)
      }
    }

    // Mostrar estado final
    const automovilesFinal = await prisma.automovil.findMany({
      include: {
        propietario: {
          select: {
            id: true,
            nombre: true,
            cedula: true
          }
        }
      },
      orderBy: {
        movil: 'asc'
      }
    })

    console.log('\n📊 Estado final de automóviles y propietarios:')
    automovilesFinal.forEach(auto => {
      const propietarioInfo = auto.propietario ? `${auto.propietario.nombre} (${auto.propietario.cedula})` : 'Sin propietario'
      console.log(`- Móvil ${auto.movil} (${auto.placa}): ${propietarioInfo}`)
    })

    console.log('\n✅ Configuración completada. El sistema de programación está listo para usar.')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupProgramacionPropietarios()
