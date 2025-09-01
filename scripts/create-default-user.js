const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDefaultUser() {
  try {
    // Verificar si ya existe un usuario por defecto
    const existingUser = await prisma.usuario.findFirst({
      where: {
        nombre: 'Usuario Sistema'
      }
    });

    if (existingUser) {
      console.log('✅ Usuario por defecto ya existe:', existingUser);
      return existingUser;
    }

    // Crear usuario por defecto
    const defaultUser = await prisma.usuario.create({
      data: {
        usuario: 'sistema',
        nombre: 'Usuario Sistema',
        correo: 'sistema@enruta.com',
        password: 'sistema123',
        activo: true,
        rol: 'ADMIN',
        tablaProgramada: true
      }
    });

    console.log('✅ Usuario por defecto creado:', defaultUser);
    return defaultUser;
  } catch (error) {
    console.error('❌ Error creando usuario por defecto:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
createDefaultUser()
  .then(() => {
    console.log('🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error en el script:', error);
    process.exit(1);
  });
