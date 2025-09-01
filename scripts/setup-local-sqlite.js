const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function setupLocalSQLite() {
  console.log('Configurando base de datos SQLite local...');
  
  // Cambiar temporalmente a SQLite
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  const localSchemaPath = path.join(__dirname, '../prisma/schema-local.prisma');
  
  // Copiar schema local
  if (fs.existsSync(localSchemaPath)) {
    fs.copyFileSync(localSchemaPath, schemaPath);
    console.log('Schema SQLite copiado correctamente');
  } else {
    console.error('No se encontró schema-local.prisma');
    return;
  }
  
  // Generar cliente Prisma
  const { execSync } = require('child_process');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('Cliente Prisma generado');
    
    // Crear base de datos
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('Base de datos SQLite creada');
    
    console.log('\n✅ Base de datos SQLite configurada correctamente');
    console.log('📁 Archivo: prisma/dev-local.db');
    console.log('🔗 DATABASE_URL: file:./dev-local.db');
    
  } catch (error) {
    console.error('Error configurando SQLite:', error.message);
  }
}

setupLocalSQLite();
