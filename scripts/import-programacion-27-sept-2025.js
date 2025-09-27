import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Datos de programación para el 27 de septiembre 2025
const programacionData = [
  // DESPACHO D, RUT7 CORZO LORETO
  { despacho: 'DESPACHO D, RUT7 CORZO LORETO', hora: '04:50', movil: 1357 },
  { despacho: 'DESPACHO D, RUT7 CORZO LORETO', hora: '04:57', movil: 1352 },
  { despacho: 'DESPACHO D, RUT7 CORZO LORETO', hora: '05:04', movil: 1429 },
  { despacho: 'DESPACHO D, RUT7 CORZO LORETO', hora: '05:11', movil: 1431 },

  // DESPACHO D RUT4 PAMPA-CORZO
  { despacho: 'DESPACHO D RUT4 PAMPA-CORZO', hora: '04:50', movil: 1317 },
  { despacho: 'DESPACHO D RUT4 PAMPA-CORZO', hora: '05:00', movil: 1324 },
  { despacho: 'DESPACHO D RUT4 PAMPA-CORZO', hora: '05:10', movil: 1414 },

  // Despacho B
  { despacho: 'Despacho B', hora: '04:55', movil: 1443 },
  { despacho: 'Despacho B', hora: '05:05', movil: 1380 },
  { despacho: 'Despacho B', hora: '05:15', movil: 1381 },
  { despacho: 'Despacho B', hora: '05:25', movil: 1401 },
  { despacho: 'Despacho B', hora: '05:35', movil: 1313 },
  { despacho: 'Despacho B', hora: '05:41', movil: 1080 },
  { despacho: 'Despacho B', hora: '05:45', movil: 1370 },
  { despacho: 'Despacho B', hora: '05:57', movil: 1317 },
  { despacho: 'Despacho B', hora: '06:05', movil: 1324 },
  { despacho: 'Despacho B', hora: '06:15', movil: 1444 },
  { despacho: 'Despacho B', hora: '06:25', movil: 1358 },
  { despacho: 'Despacho B', hora: '06:35', movil: 1427 },
  { despacho: 'Despacho B', hora: '06:42', movil: 1347 },
  { despacho: 'Despacho B', hora: '06:55', movil: 1430 },

  // DESPACHO E RUT7 CORZO
  { despacho: 'DESPACHO E RUT7 CORZO', hora: '04:55', movil: 1439 },
  { despacho: 'DESPACHO E RUT7 CORZO', hora: '05:05', movil: 1444 },
  { despacho: 'DESPACHO E RUT7 CORZO', hora: '05:15', movil: 1084 },

  // Despacho A
  { despacho: 'Despacho A', hora: '05:00', movil: 1412 },
  { despacho: 'Despacho A', hora: '05:10', movil: 1389 },
  { despacho: 'Despacho A', hora: '05:20', movil: 1410 },
  { despacho: 'Despacho A', hora: '05:28', movil: 1177 },
  { despacho: 'Despacho A', hora: '05:36', movil: 1323 },
  { despacho: 'Despacho A', hora: '05:44', movil: 1254 },
  { despacho: 'Despacho A', hora: '05:52', movil: 1418 },
  { despacho: 'Despacho A', hora: '06:00', movil: 1337 },
  { despacho: 'Despacho A', hora: '06:10', movil: 1352 },
  { despacho: 'Despacho A', hora: '06:20', movil: 1429 },
  { despacho: 'Despacho A', hora: '06:30', movil: 1431 },
  { despacho: 'Despacho A', hora: '06:40', movil: 1273 },
  { despacho: 'Despacho A', hora: '06:50', movil: 1434 },
  { despacho: 'Despacho A', hora: '07:00', movil: 1326 },
  { despacho: 'Despacho A', hora: '17:00', movil: 1381 },
  { despacho: 'Despacho A', hora: '17:12', movil: 1425 },
  { despacho: 'Despacho A', hora: '17:24', movil: 1401 },
  { despacho: 'Despacho A', hora: '17:36', movil: 1344 },
  { despacho: 'Despacho A', hora: '17:48', movil: 1313 },
  { despacho: 'Despacho A', hora: '18:00', movil: 1375 },
  { despacho: 'Despacho A', hora: '18:12', movil: 1080 },
  { despacho: 'Despacho A', hora: '18:24', movil: 1435 },
  { despacho: 'Despacho A', hora: '18:36', movil: 1413 },
  { despacho: 'Despacho A', hora: '18:48', movil: 1420 },
  { despacho: 'Despacho A', hora: '19:00', movil: 1338 },
  { despacho: 'Despacho A', hora: '19:12', movil: 1363 },
  { despacho: 'Despacho A', hora: '19:24', movil: 1423 },
  { despacho: 'Despacho A', hora: '19:36', movil: 1427 },
  { despacho: 'Despacho A', hora: '19:48', movil: 1437 },
  { despacho: 'Despacho A', hora: '20:00', movil: 1400 },
  { despacho: 'Despacho A', hora: '20:12', movil: 1376 },
  { despacho: 'Despacho A', hora: '20:24', movil: 1144 },

  // Despacho C
  { despacho: 'Despacho C', hora: '05:00', movil: 1441 },
  { despacho: 'Despacho C', hora: '05:10', movil: 1424 },
  { despacho: 'Despacho C', hora: '05:20', movil: 1425 },
  { despacho: 'Despacho C', hora: '05:30', movil: 1344 },
  { despacho: 'Despacho C', hora: '05:40', movil: 1275 },
  { despacho: 'Despacho C', hora: '05:50', movil: 1435 },
  { despacho: 'Despacho C', hora: '06:00', movil: 1439 },
  { despacho: 'Despacho C', hora: '06:10', movil: 1411 },
  { despacho: 'Despacho C', hora: '06:10', movil: 1414 },
  { despacho: 'Despacho C', hora: '06:20', movil: 1437 },
  { despacho: 'Despacho C', hora: '06:30', movil: 1400 },
  { despacho: 'Despacho C', hora: '06:50', movil: 1376 },
  { despacho: 'Despacho C', hora: '07:00', movil: 1144 },
  { despacho: 'Despacho C', hora: '13:00', movil: 1273 },
  { despacho: 'Despacho C', hora: '19:20', movil: 1442 },
  { despacho: 'Despacho C', hora: '19:40', movil: 1434 },
  { despacho: 'Despacho C', hora: '20:00', movil: 1443 },
  { despacho: 'Despacho C', hora: '20:20', movil: 1326 },

  // Despacho Puente piedra
  { despacho: 'Despacho Puente piedra', hora: '05:31', movil: 1413 },
  { despacho: 'Despacho Puente piedra', hora: '06:27', movil: 1420 },
  { despacho: 'Despacho Puente piedra', hora: '06:45', movil: 1338 },
  { despacho: 'Despacho Puente piedra', hora: '17:00', movil: 1418 },
  { despacho: 'Despacho Puente piedra', hora: '17:30', movil: 1370 },
  { despacho: 'Despacho Puente piedra', hora: '18:00', movil: 1431 }
];

// Función para convertir hora string a minutos desde medianoche
function horaStringToMinutos(horaStr) {
  const [horas, minutos] = horaStr.split(':').map(Number);
  return horas * 60 + minutos;
}

// Función para buscar ruta por nombre de despacho
async function buscarRutaPorDespacho(nombreDespacho) {
  // Mapeo de nombres de despacho a nombres de ruta
  const mapeoRutas = {
    'DESPACHO D, RUT7 CORZO LORETO': 'Despacho D',
    'DESPACHO D RUT4 PAMPA-CORZO': 'Despacho D',
    'Despacho B': 'Despacho B',
    'DESPACHO E RUT7 CORZO': 'Despacho E',
    'Despacho A': 'Despacho A',
    'Despacho C': 'Despacho C',
    'Despacho Puente piedra': 'Despacho Puente Piedra'
  };

  const nombreRuta = mapeoRutas[nombreDespacho];
  if (!nombreRuta) {
    console.warn(`No se encontró mapeo para despacho: ${nombreDespacho}`);
    return null;
  }

  const ruta = await prisma.ruta.findFirst({
    where: {
      nombre: {
        contains: nombreRuta,
        mode: 'insensitive'
      }
    }
  });

  return ruta;
}

// Función para buscar automóvil por número de móvil
async function buscarAutomovilPorMovil(numeroMovil) {
  const automovil = await prisma.automovil.findFirst({
    where: {
      movil: numeroMovil.toString()
    }
  });

  return automovil;
}

async function importarProgramacion() {
  try {
    console.log('🚀 Iniciando importación de programación del 27 de septiembre 2025...');
    
    // Fecha objetivo: 27 de septiembre 2025
    const fechaProgramacion = new Date('2025-09-27T00:00:00.000Z');
    
    let importadosExitosos = 0;
    let errores = 0;
    
    for (const item of programacionData) {
      try {
        // Buscar ruta
        const ruta = await buscarRutaPorDespacho(item.despacho);
        if (!ruta) {
          console.warn(`⚠️  Ruta no encontrada para despacho: ${item.despacho}`);
        }

        // Buscar automóvil
        const automovil = await buscarAutomovilPorMovil(item.movil);
        if (!automovil) {
          console.warn(`⚠️  Automóvil no encontrado para móvil: ${item.movil}`);
          errores++;
          continue;
        }

        // Convertir hora a minutos
        const horaEnMinutos = horaStringToMinutos(item.hora);

        // Verificar si ya existe una programación para este automóvil en esta fecha y hora
        const programacionExistente = await prisma.programacion.findFirst({
          where: {
            automovilId: automovil.id,
            fecha: fechaProgramacion,
            hora: horaEnMinutos
          }
        });

        if (programacionExistente) {
          console.log(`ℹ️  Ya existe programación para móvil ${item.movil} a las ${item.hora}`);
          continue;
        }

        // Crear la programación
        await prisma.programacion.create({
          data: {
            automovilId: automovil.id,
            fecha: fechaProgramacion,
            hora: horaEnMinutos,
            rutaId: ruta?.id || null,
            estado: 'PENDIENTE'
          }
        });

        console.log(`✅ Programación creada: Móvil ${item.movil} - ${item.hora} - ${item.despacho}`);
        importadosExitosos++;

      } catch (error) {
        console.error(`❌ Error procesando ${item.despacho} - ${item.hora} - ${item.movil}:`, error.message);
        errores++;
      }
    }

    console.log('\n📊 Resumen de importación:');
    console.log(`✅ Programaciones importadas exitosamente: ${importadosExitosos}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📝 Total procesados: ${programacionData.length}`);

  } catch (error) {
    console.error('❌ Error general en la importación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la importación
importarProgramacion();