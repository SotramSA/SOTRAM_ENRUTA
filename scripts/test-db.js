import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual en un módulo ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  connectionString: "postgresql://database_enruta_user:fw5ePwqIAoWDd69TZ7sXpuaaBCo5hYqS@dpg-d21rp7ffte5s73806emg-a.oregon-postgres.render.com/database_enruta",
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    await client.connect();
    console.log("✅ Conectado a la base de datos");
    
    // Leer el archivo de migración
    const migrationPath = path.join(process.cwd(), 'prisma/migrations/manual_add_document_dates/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log("🚀 Ejecutando migración...");
    await client.query(migrationSQL);
    console.log("✅ Migración completada exitosamente");
  } catch (error) {
    console.error("❌ Error ejecutando la migración:", error.message);
  } finally {
    await client.end();
  }
}

runMigration();