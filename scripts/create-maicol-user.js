import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createMaicolUser() {
  try {
    console.log('🔄 Creando usuario maicolrincon93...');
    
    // Crear hash de la contraseña
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // Crear usuario con todos los permisos
    const user = await prisma.usuario.upsert({
      where: { usuario: 'maicolrincon93' },
      update: {
        // Actualizar permisos si el usuario ya existe
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
      },
      create: {
        usuario: 'maicolrincon93',
        password: hashedPassword,
        nombre: 'Maicol Rincon',
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
    });
    
    console.log('✅ Usuario creado/actualizado exitosamente!');
    console.log('📝 Credenciales:');
    console.log('   Usuario: maicolrincon93');
    console.log('   Contraseña: 123456');
    console.log('   Nombre: Maicol Rincon');
    console.log('   Estado: Activo');
    console.log('   Permisos: Todos habilitados');
    console.log('   ID: ' + user.id);
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMaicolUser();
