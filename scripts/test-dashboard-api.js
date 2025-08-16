const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDashboardAPI() {
  try {
    console.log('🧪 Probando API del dashboard...\n');

    const url = 'http://localhost:3001/api/dashboard?fechaInicio=2025-08-04&fechaFin=2025-08-04';
    
    console.log(`📡 Haciendo petición a: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error en la respuesta:', response.status, response.statusText);
      console.error('Respuesta:', data);
      return;
    }

    console.log('✅ Respuesta exitosa del API\n');

    // Verificar estructura de datos
    console.log('📊 Estructura de datos recibida:');
    console.log('- demandaPorHora:', data.demandaPorHora?.length || 0, 'elementos');
    console.log('- tiempoPromedioMinutos:', data.tiempoPromedioMinutos);
    console.log('- automovilesActivos:', data.automovilesActivos?.length || 0, 'elementos');
    console.log('- conductoresActivos:', data.conductoresActivos?.length || 0, 'elementos');
    console.log('- balanceRutas:', data.balanceRutas?.length || 0, 'elementos');
    console.log('- metricasGenerales:', data.metricasGenerales);

    // Verificar tipos de datos
    console.log('\n🔍 Verificando tipos de datos:');
    
    if (data.demandaPorHora && data.demandaPorHora.length > 0) {
      const primerElemento = data.demandaPorHora[0];
      console.log('- demandaPorHora[0].cantidad:', typeof primerElemento.cantidad, primerElemento.cantidad);
    }

    if (data.automovilesActivos && data.automovilesActivos.length > 0) {
      const primerAutomovil = data.automovilesActivos[0];
      console.log('- automovilesActivos[0].turnosAsignados:', typeof primerAutomovil.turnosAsignados, primerAutomovil.turnosAsignados);
    }

    if (data.conductoresActivos && data.conductoresActivos.length > 0) {
      const primerConductor = data.conductoresActivos[0];
      console.log('- conductoresActivos[0].turnosAsignados:', typeof primerConductor.turnosAsignados, primerConductor.turnosAsignados);
    }

    console.log('- tiempoPromedioMinutos:', typeof data.tiempoPromedioMinutos, data.tiempoPromedioMinutos);
    console.log('- metricasGenerales.totalTurnos:', typeof data.metricasGenerales?.totalTurnos, data.metricasGenerales?.totalTurnos);

    // Mostrar algunos datos de ejemplo
    console.log('\n📋 Datos de ejemplo:');
    
    if (data.demandaPorHora && data.demandaPorHora.length > 0) {
      console.log('Demanda por hora (todas las horas con datos):');
      data.demandaPorHora.forEach(item => {
        if (item.cantidad > 0) {
          console.log(`  Hora ${item.hora}: ${item.cantidad} turnos`);
        }
      });
    }

    if (data.automovilesActivos && data.automovilesActivos.length > 0) {
      console.log('\nAutomóviles más activos (top 3):');
      data.automovilesActivos.slice(0, 3).forEach(item => {
        console.log(`  Móvil ${item.movil} (${item.placa}): ${item.turnosAsignados} turnos`);
      });
    }

    if (data.conductoresActivos && data.conductoresActivos.length > 0) {
      console.log('\nConductores más activos (top 3):');
      data.conductoresActivos.slice(0, 3).forEach(item => {
        console.log(`  ${item.nombre}: ${item.turnosAsignados} turnos`);
      });
    }

    console.log('\n✅ Prueba completada exitosamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

testDashboardAPI(); 