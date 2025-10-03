const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNewField() {
  try {
    console.log('🧪 Probando el nuevo campo realizadoPorConductorId...');
    
    // Buscar una programación existente
    const programacion = await prisma.programacion.findFirst({
      include: {
        automovil: true,
        ruta: true,
        realizadoPorConductor: true
      }
    });
    
    if (programacion) {
      console.log('📋 Programación encontrada:', {
        id: programacion.id,
        estado: programacion.estado,
        realizadoPorId: programacion.realizadoPorId,
        realizadoPorConductorId: programacion.realizadoPorConductorId,
        realizadoPorConductor: programacion.realizadoPorConductor?.nombre || 'No asignado'
      });
      
      // Intentar actualizar el campo
      console.log('🔄 Intentando actualizar el campo realizadoPorConductorId...');
      
      // Buscar un conductor para asignar
      const conductor = await prisma.conductor.findFirst({
        where: { activo: true }
      });
      
      if (conductor) {
        const updated = await prisma.programacion.update({
          where: { id: programacion.id },
          data: {
            realizadoPorConductorId: conductor.id,
            estado: 'COMPLETADO'
          },
          include: {
            realizadoPorConductor: true
          }
        });
        
        console.log('✅ Campo actualizado exitosamente:', {
          id: updated.id,
          realizadoPorConductorId: updated.realizadoPorConductorId,
          realizadoPorConductor: updated.realizadoPorConductor?.nombre,
          estado: updated.estado
        });
      } else {
        console.log('❌ No se encontró ningún conductor activo');
      }
    } else {
      console.log('❌ No se encontró ninguna programación');
    }
    
  } catch (error) {
    console.error('❌ Error al probar el nuevo campo:', error.message);
    if (error.code) {
      console.error('Código de error:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testNewField();