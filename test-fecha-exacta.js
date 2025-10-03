const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFechaExacta() {
  console.log('🧪 Probando registro de fecha exacta...\n');
  
  // Mostrar información del sistema
  const ahora = new Date();
  console.log('⏰ Información del sistema:');
  console.log(`Fecha/hora actual: ${ahora.toISOString()}`);
  console.log(`Fecha/hora local: ${ahora.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);
  console.log(`Zona horaria del sistema: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`Offset UTC: ${ahora.getTimezoneOffset()} minutos\n`);

  try {
    // Hacer una petición POST al endpoint temporal
    const response = await fetch('http://localhost:3000/api/test-fecha-exacta-temp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        movilId: '1',
        conductorId: '1', 
        despacho: 'DESPACHO_A',
        hora: '14:30' // Hora específica para probar
      })
    });

    if (!response.ok) {
      console.log(`❌ Error en la petición: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Respuesta del servidor:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Turno creado exitosamente');
    console.log('📊 Datos del turno creado:');
    console.log(`ID: ${result.turno.id}`);
    
    // Analizar las fechas
    const fecha = new Date(result.turno.fecha);
    const horaSalida = new Date(result.turno.horaSalida);
    const horaCreacion = new Date(result.turno.horaCreacion);
    
    console.log('\n📅 Análisis de fechas:');
    console.log(`Fecha (DB): ${result.turno.fecha}`);
    console.log(`Fecha (Local): ${fecha.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);
    console.log(`Diferencia con ahora: ${Math.round((fecha - ahora) / (1000 * 60))} minutos`);
    
    console.log(`\nHora Salida (DB): ${result.turno.horaSalida}`);
    console.log(`Hora Salida (Local): ${horaSalida.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);
    console.log(`Hora esperada: 14:30`);
    console.log(`Hora registrada: ${horaSalida.getHours()}:${horaSalida.getMinutes().toString().padStart(2, '0')}`);
    
    console.log(`\nHora Creación (DB): ${result.turno.horaCreacion}`);
    console.log(`Hora Creación (Local): ${horaCreacion.toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);
    console.log(`Diferencia con ahora: ${Math.round((horaCreacion - ahora) / (1000 * 60))} minutos`);

    // Verificar si las fechas están correctas
    const fechaCorrecta = Math.abs(fecha - ahora) < 60000; // Menos de 1 minuto de diferencia
    const horaCorrecta = horaSalida.getHours() === 14 && horaSalida.getMinutes() === 30;
    const creacionCorrecta = Math.abs(horaCreacion - ahora) < 60000;
    
    console.log('\n✅ Verificación:');
    console.log(`Fecha correcta: ${fechaCorrecta ? '✅' : '❌'}`);
    console.log(`Hora salida correcta: ${horaCorrecta ? '✅' : '❌'}`);
    console.log(`Hora creación correcta: ${creacionCorrecta ? '✅' : '❌'}`);
    
    if (fechaCorrecta && horaCorrecta && creacionCorrecta) {
      console.log('\n🎉 ¡Todas las fechas se registraron correctamente!');
    } else {
      console.log('\n⚠️ Hay problemas con el registro de fechas');
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFechaExacta();