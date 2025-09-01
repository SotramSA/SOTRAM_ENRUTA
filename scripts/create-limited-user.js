import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createLimitedUser() {
  try {
    console.log('🔄 Creando usuario con permisos limitados...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const user = await prisma.usuario.upsert({
      where: { usuario: 'usuario_limite' },
      update: {
        tablaTurno: false, // Sin permisos de turno
        tablaConductor: true,
        tablaAutomovil: true,
        tablaRuta: true,
        tablaPlanilla: true,
        tablaSancionConductor: true,
        tablaSancionAutomovil: true,
        tablaFecha: true,
        tablaUsuario: false,
        tablaConfiguracion: true,
        tablaInformes: true,
        tablaPropietarios: true,
        tablaProgramada: true,
      },
      create: {
        usuario: 'usuario_limite',
        password: hashedPassword,
        nombre: 'Usuario Limitado',
        activo: true,
        tablaTurno: false, // Sin permisos de turno
        tablaConductor: true,
        tablaAutomovil: true,
        tablaRuta: true,
        tablaConductorAutomovil: true,
        tablaPlanilla: true,
        tablaSancionConductor: true,
        tablaSancionAutomovil: true,
        tablaFecha: true,
        tablaUsuario: false,
        tablaConfiguracion: true,
        tablaInformes: true,
        tablaPropietarios: true,
        tablaProgramada: true,
      }
    });
    
    console.log('✅ Usuario creado/actualizado exitosamente!');
    console.log('📝 Credenciales:');
    console.log('   Usuario: usuario_limite');
    console.log('   Contraseña: 123456');
    console.log('   Nombre: Usuario Limitado');
    console.log('   Estado: Activo');
    console.log('   Permisos:');
    console.log('     ✅ tablaConductor: true');
    console.log('     ✅ tablaAutomovil: true');
    console.log('     ✅ tablaRuta: true');
    console.log('     ❌ tablaTurno: false (SIN PERMISO)');
    console.log('     ✅ tablaPlanilla: true');
    console.log('     ❌ tablaUsuario: false (SIN PERMISO)');
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createLimitedUser();
