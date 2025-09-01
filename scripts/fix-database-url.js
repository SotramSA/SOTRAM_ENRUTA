// Script para mostrar cómo modificar la DATABASE_URL
// Copia este formato en tu archivo .env

const originalUrl = process.env.DATABASE_URL || "postgresql://usuario:password@dpg-d21rp7ffte5s73806emg-a.oregon-postgres.render.com/database_enruta";

// Agregar parámetros de conexión para estabilidad
const stableUrl = originalUrl + "?connection_limit=1&pool_timeout=20&connect_timeout=60&idle_timeout=300";

console.log("🔧 URL original:");
console.log(originalUrl);
console.log("\n🔧 URL con parámetros de estabilidad:");
console.log(stableUrl);

console.log("\n📝 Instrucciones:");
console.log("1. Copia la URL con parámetros de estabilidad");
console.log("2. Reemplaza la DATABASE_URL en tu archivo .env");
console.log("3. Reinicia tu aplicación");

// Parámetros explicados:
console.log("\n📚 Parámetros explicados:");
console.log("- connection_limit=1: Limita a 1 conexión por instancia");
console.log("- pool_timeout=20: Timeout de 20 segundos para el pool");
console.log("- connect_timeout=60: Timeout de 60 segundos para conectar");
console.log("- idle_timeout=300: Timeout de 5 minutos para conexiones inactivas");
