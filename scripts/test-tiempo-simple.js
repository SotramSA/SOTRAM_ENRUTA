const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTiempoSimple() {
  try {
    console.log('🔍 Probando consulta simple de tiempo promedio...\n');
    
    const inicio = new Date('2025-08-04T00:00:00-05:00');
    const fin = new Date('2025-08-04T23:59:59-05:00');
    
    const resultado = await prisma.$queryRaw`
      SELECT 
        AVG(EXTRACT(EPOCH FROM ("horaSalida" - "horaCreacion")) / 60) as tiempoPromedioMinutos
      FROM "Turno" 
      WHERE "horaSalida" >= ${inicio} AND "horaSalida" <= ${fin}
      AND "horaSalida" > "horaCreacion"
    `;
    
    console.log('📊 Resultado completo:');
    console.log(resultado);
    console.log('Tipo:', typeof resultado);
    console.log('Longitud:', resultado.length);
    
    if (resultado.length > 0) {
      console.log('Primer elemento:', resultado[0]);
      console.log('tiempoPromedioMinutos:', resultado[0].tiempoPromedioMinutos);
      console.log('Tipo de tiempoPromedioMinutos:', typeof resultado[0].tiempoPromedioMinutos);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTiempoSimple(); 