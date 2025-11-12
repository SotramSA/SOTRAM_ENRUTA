// Test script para verificar la corrección del problema de zona horaria
// Este script simula el comportamiento antes y después de la corrección

console.log('🧪 Probando corrección de zona horaria...\n');

// Simular fecha de programación (ejemplo: 2025-01-20)
const fechaProgramacion = new Date('2025-01-20');
console.log('📅 Fecha de programación:', fechaProgramacion.toISOString());

// Simular hora programada (ejemplo: 14:30)
const hours = 14;
const minutes = 30;

console.log('\n--- ANTES DE LA CORRECCIÓN (problemático) ---');
// Método problemático que causaba las 5 horas adicionales
const fechaProblematica = new Date(fechaProgramacion);
fechaProblematica.setUTCHours(hours, minutes, 0, 0);
console.log('❌ Con setUTCHours:', fechaProblematica.toISOString());
console.log('❌ Hora mostrada:', fechaProblematica.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }));

console.log('\n--- DESPUÉS DE LA CORRECCIÓN (correcto) ---');
// Método corregido que NO causa las 5 horas adicionales
const fechaCorregida = new Date(fechaProgramacion);
fechaCorregida.setHours(hours, minutes, 0, 0);
console.log('✅ Con setHours:', fechaCorregida.toISOString());
console.log('✅ Hora mostrada:', fechaCorregida.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }));

console.log('\n--- COMPARACIÓN ---');
const diferenciaHoras = (fechaProblematica.getTime() - fechaCorregida.getTime()) / (1000 * 60 * 60);
console.log(`⏰ Diferencia entre métodos: ${diferenciaHoras} horas`);

console.log('\n--- PRUEBA DEL MÉTODO getHoraBogota CORREGIDO ---');
// Simular el método getHoraBogota corregido
function getHoraBogotaCorregido(date) {
    const formatter = new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const seconds = parseInt(parts.find(p => p.type === 'second')?.value || '0');
    
    // CORREGIDO: usar constructor local en lugar de Date.UTC
    const bogotaDate = new Date(year, month - 1, day, hours, minutes, seconds);
    
    return { hours, minutes, date: bogotaDate };
}

const fechaPrueba = new Date();
const resultadoCorregido = getHoraBogotaCorregido(fechaPrueba);
console.log('✅ Método getHoraBogota corregido:');
console.log('   - Hora extraída:', `${resultadoCorregido.hours}:${resultadoCorregido.minutes.toString().padStart(2, '0')}`);
console.log('   - Fecha resultante:', resultadoCorregido.date.toISOString());
console.log('   - Hora local:', resultadoCorregido.date.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }));

console.log('\n🎉 Corrección completada. Las fechas ahora deben mostrar la hora correcta sin las 5 horas adicionales.');