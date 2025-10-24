const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function refreshUserSession() {
  try {
    console.log('🔄 Actualizando sesión del usuario...');

    // Obtener el usuario actualizado con todos los campos
    const user = await prisma.usuario.findUnique({
      where: {
        usuario: 'maicolrincon93'
      }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:', {
      usuario: user.usuario,
      nombre: user.nombre,
      tablaInspeccion: user.tablaInspeccion
    });

    console.log('\n📋 Todos los permisos del usuario:');
    console.log('   tablaConductor:', user.tablaConductor);
    console.log('   tablaAutomovil:', user.tablaAutomovil);
    console.log('   tablaRuta:', user.tablaRuta);
    console.log('   tablaConductorAutomovil:', user.tablaConductorAutomovil);
    console.log('   tablaTurno:', user.tablaTurno);
    console.log('   tablaPlanilla:', user.tablaPlanilla);
    console.log('   tablaSancionConductor:', user.tablaSancionConductor);
    console.log('   tablaSancionAutomovil:', user.tablaSancionAutomovil);
    console.log('   tablaFecha:', user.tablaFecha);
    console.log('   tablaUsuario:', user.tablaUsuario);
    console.log('   tablaConfiguracion:', user.tablaConfiguracion);
    console.log('   tablaInformes:', user.tablaInformes);
    console.log('   tablaPropietarios:', user.tablaPropietarios);
    console.log('   tablaProgramada:', user.tablaProgramada);
    console.log('   tablaInspeccion:', user.tablaInspeccion);

    console.log('\n💡 Para que los cambios tomen efecto:');
    console.log('   1. Visita: http://localhost:3001/refresh-session');
    console.log('   2. O cierra sesión y vuelve a iniciar sesión');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

refreshUserSession();