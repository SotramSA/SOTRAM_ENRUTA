const axios = require('axios');

async function testPropietarioConductor() {
  try {
    console.log('🧪 Probando creación de propietario que también es conductor...');
    
    const testData = {
      nombre: 'Juan Pérez Test',
      cedula: '1234567890',
      telefono: '3001234567',
      correo: 'juan.perez@test.com',
      observaciones: 'Propietario que también es conductor - TEST',
      estado: true,
      automoviles: [],
      esConductor: true,
      licenciaConduccion: '2025-12-31'
    };

    console.log('📤 Enviando datos:', testData);

    const response = await axios.post('http://localhost:3000/api/propietarios', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Respuesta exitosa:', {
      status: response.status,
      data: response.data
    });

    // Verificar que se creó tanto el propietario como el conductor
    console.log('\n🔍 Verificando que se creó el conductor...');
    
    const conductoresResponse = await axios.get('http://localhost:3000/api/conductores?limit=1000');
    const conductores = conductoresResponse.data.conductores;
    
    const conductorCreado = conductores.find(c => c.cedula === testData.cedula);
    
    if (conductorCreado) {
      console.log('✅ Conductor creado automáticamente:', {
        id: conductorCreado.id,
        nombre: conductorCreado.nombre,
        cedula: conductorCreado.cedula,
        licenciaConduccion: conductorCreado.licenciaConduccion
      });
    } else {
      console.log('❌ No se encontró el conductor creado automáticamente');
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.response?.data || error.message);
  }
}

testPropietarioConductor();
