const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Restaurando configuración de PostgreSQL...');

// 1. Restaurar schema original
const originalSchema = path.join(__dirname, '../prisma/schema.prisma');
const backupSchema = path.join(__dirname, '../prisma/schema.backup.prisma');

if (fs.existsSync(backupSchema)) {
  fs.copyFileSync(backupSchema, originalSchema);
  console.log('✅ Schema original restaurado');
  
  // Eliminar backup
  fs.unlinkSync(backupSchema);
  console.log('✅ Backup eliminado');
} else {
  console.log('⚠️  No se encontró backup del schema original');
}

// 2. Generar cliente Prisma
try {
  console.log('🔄 Generando cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Cliente Prisma generado');
} catch (error) {
  console.error('❌ Error generando cliente:', error.message);
}

console.log('\n🎉 Configuración de PostgreSQL restaurada!');
console.log('⚠️  Asegúrate de que la DATABASE_URL esté configurada correctamente en tu .env');
