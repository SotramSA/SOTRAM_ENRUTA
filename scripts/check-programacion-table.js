const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProgramacionTable() {
  try {
    console.log('🔍 Verificando estructura de la tabla Programacion...');
    
    // Consulta SQL directa para ver la estructura de la tabla
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Programacion' 
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Columnas de la tabla Programacion:');
    console.table(result);
    
    // Verificar si existe el campo realizadoPorConductorId
    const hasRealizadoPorConductorId = result.some(col => col.column_name === 'realizadoPorConductorId');
    
    if (hasRealizadoPorConductorId) {
      console.log('✅ El campo realizadoPorConductorId existe en la tabla');
    } else {
      console.log('❌ El campo realizadoPorConductorId NO existe en la tabla');
    }
    
    // Verificar constraints de foreign key
    const constraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name='Programacion';
    `;
    
    console.log('🔗 Foreign Keys de la tabla Programacion:');
    console.table(constraints);
    
  } catch (error) {
    console.error('❌ Error al verificar la tabla:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProgramacionTable();