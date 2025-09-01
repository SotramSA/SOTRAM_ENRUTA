const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserPermissions() {
  try {
    console.log('🔧 Actualizando permisos de usuario...');

    // Actualizar el usuario maicolrincon93 para darle acceso a programación
    const updatedUser = await prisma.usuario.update({
      where: {
        usuario: 'maicolrincon93'
      },
      data: {
        tablaProgramada: true
      }
    });

    console.log('✅ Usuario actualizado:', {
      usuario: updatedUser.usuario,
      nombre: updatedUser.nombre,
      tablaProgramada: updatedUser.tablaProgramada
    });

    // Verificar todos los permisos del usuario
    console.log('\n📋 Permisos actualizados del usuario:');
    console.log('   tablaConductor:', updatedUser.tablaConductor);
    console.log('   tablaAutomovil:', updatedUser.tablaAutomovil);
    console.log('   tablaRuta:', updatedUser.tablaRuta);
    console.log('   tablaConductorAutomovil:', updatedUser.tablaConductorAutomovil);
    console.log('   tablaTurno:', updatedUser.tablaTurno);
    console.log('   tablaPlanilla:', updatedUser.tablaPlanilla);
    console.log('   tablaSancionConductor:', updatedUser.tablaSancionConductor);
    console.log('   tablaSancionAutomovil:', updatedUser.tablaSancionAutomovil);
    console.log('   tablaFecha:', updatedUser.tablaFecha);
    console.log('   tablaUsuario:', updatedUser.tablaUsuario);
    console.log('   tablaConfiguracion:', updatedUser.tablaConfiguracion);
    console.log('   tablaInformes:', updatedUser.tablaInformes);
    console.log('   tablaPropietarios:', updatedUser.tablaPropietarios);
    console.log('   tablaProgramada:', updatedUser.tablaProgramada);

  } catch (error) {
    console.error('❌ Error actualizando permisos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserPermissions();
