// Script simple para crear usuario maicolrincon93
// Ejecutar: node scripts/create-user-simple.js

const bcrypt = require('bcryptjs');

async function createUser() {
  try {
    console.log('🔄 Creando usuario maicolrincon93...');
    
    // Crear hash de la contraseña
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    console.log('✅ Hash de contraseña creado');
    console.log('📝 Datos del usuario:');
    console.log('   Usuario: maicolrincon93');
    console.log('   Contraseña: 123456');
    console.log('   Hash: ' + hashedPassword.substring(0, 20) + '...');
    console.log('   Nombre: Maicol Rincon');
    console.log('   Permisos: Todos habilitados');
    
    console.log('\n💡 Para crear el usuario en la base de datos:');
    console.log('1. Asegúrate de que la DATABASE_URL esté configurada en tu .env');
    console.log('2. Ejecuta: npx prisma db push');
    console.log('3. Luego intenta hacer login con las credenciales');
    console.log('4. El sistema creará automáticamente el usuario si no existe');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createUser();
