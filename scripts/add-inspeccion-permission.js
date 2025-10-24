const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addInspeccionPermission() {
  try {
    console.log('🔧 Agregando permiso de inspecciones...');

    // Primero, intentar agregar la columna tablaInspeccion si no existe
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Usuario" 
        ADD COLUMN IF NOT EXISTS "tablaInspeccion" BOOLEAN DEFAULT false;
      `;
      console.log('✅ Columna tablaInspeccion agregada a la tabla Usuario');
    } catch (error) {
      console.log('ℹ️  La columna tablaInspeccion ya existe o hubo un error:', error.message);
    }

    // Actualizar el usuario maicolrincon93 para darle acceso a inspecciones
    const updatedUser = await prisma.usuario.update({
      where: {
        usuario: 'maicolrincon93'
      },
      data: {
        tablaInspeccion: true
      }
    });

    console.log('✅ Usuario actualizado:', {
      usuario: updatedUser.usuario,
      nombre: updatedUser.nombre,
      tablaInspeccion: updatedUser.tablaInspeccion
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
    console.log('   tablaInspeccion:', updatedUser.tablaInspeccion);

  } catch (error) {
    console.error('❌ Error agregando permiso de inspecciones:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addInspeccionPermission();