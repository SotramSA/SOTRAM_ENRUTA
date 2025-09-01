const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Cambiando a base de datos local SQLite...');

// 1. Hacer backup del schema original
const originalSchema = path.join(__dirname, '../prisma/schema.prisma');
const backupSchema = path.join(__dirname, '../prisma/schema.backup.prisma');
const localSchema = path.join(__dirname, '../prisma/schema-local.prisma');

if (fs.existsSync(originalSchema)) {
  fs.copyFileSync(originalSchema, backupSchema);
  console.log('✅ Backup del schema original creado');
}

// 2. Copiar schema local como principal
if (fs.existsSync(localSchema)) {
  fs.copyFileSync(localSchema, originalSchema);
  console.log('✅ Schema local copiado como principal');
}

// 3. Generar cliente Prisma
try {
  console.log('🔄 Generando cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Cliente Prisma generado');
} catch (error) {
  console.error('❌ Error generando cliente:', error.message);
}

// 4. Crear base de datos local
try {
  console.log('🔄 Creando base de datos local...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Base de datos local creada');
} catch (error) {
  console.error('❌ Error creando base de datos:', error.message);
}

// 5. Crear usuario de prueba
try {
  console.log('🔄 Creando usuario de prueba...');
  const bcrypt = require('bcryptjs');
  const { PrismaClient } = require('@prisma/client');
  
  const prisma = new PrismaClient();
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.usuario.upsert({
    where: { usuario: 'admin' },
    update: {},
    create: {
      usuario: 'admin',
      password: hashedPassword,
      nombre: 'Administrador',
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
  
  console.log('✅ Usuario de prueba creado: admin / admin123');
  await prisma.$disconnect();
} catch (error) {
  console.error('❌ Error creando usuario:', error.message);
}

console.log('\n🎉 Cambio a base de datos local completado!');
console.log('📝 Credenciales de prueba:');
console.log('   Usuario: admin');
console.log('   Contraseña: admin123');
console.log('\n⚠️  Para volver a PostgreSQL, ejecuta: node scripts/restore-postgresql.js');
