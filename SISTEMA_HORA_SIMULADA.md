# 🕐 Sistema de Hora Simulada para Enrutamiento

## 📋 Descripción

El sistema de hora simulada permite cambiar la hora actual del sistema para probar el comportamiento del enrutamiento automático en diferentes momentos del día. Esto es especialmente útil para:

- **Pruebas de enrutamiento** en diferentes horas
- **Simulación de escenarios** de alta demanda
- **Validación de lógica** de frecuencia automática
- **Pruebas de rotación** de rutas A, B y C

## 🚀 Características

### ✅ Funcionalidades Principales

- **Hora Simulada**: Establecer una hora específica del día
- **Avance/Retroceso**: Mover el tiempo hacia adelante o atrás
- **Modo Real**: Volver a usar la hora real del sistema
- **Indicador Visual**: Muestra claramente si está en modo simulación
- **API REST**: Control completo vía endpoints
- **Interfaz Web**: Controlador visual en la página de turnos
- **Script CLI**: Control desde línea de comandos

### 🔧 Componentes del Sistema

1. **`TimeService`** (`src/lib/timeService.ts`)
   - Servicio global para manejar la hora simulada
   - Métodos para establecer, avanzar y resetear tiempo

2. **`TimeController`** (`src/components/ui/TimeController.tsx`)
   - Componente React para control visual
   - Actualización en tiempo real

3. **API Endpoint** (`app/api/time/route.ts`)
   - Endpoint REST para control remoto
   - Métodos GET y POST

4. **Script CLI** (`scripts/test-hora-simulada.js`)
   - Control desde línea de comandos
   - Interfaz interactiva

## 🎯 Cómo Usar

### 🌐 Interfaz Web

1. **Ir a la página de turnos**: `/turno`
2. **Usar el controlador de hora** en la parte superior
3. **Establecer hora simulada** o usar controles de avance/retroceso
4. **Observar cambios** en frecuencia y turnos

### 📟 Script de Línea de Comandos

```bash
# Ejecutar el script
node scripts/test-hora-simulada.js

# Opciones disponibles:
# 1. Ver hora actual del sistema
# 2. Establecer hora simulada
# 3. Avanzar tiempo
# 4. Probar enrutamiento
# 5. Volver a hora real
# 6. Salir
```

### 🔌 API REST

#### Obtener Hora Actual
```bash
GET /api/time
```

#### Establecer Hora Simulada
```bash
POST /api/time
{
  "action": "set",
  "hours": 8,
  "minutes": 30
}
```

#### Avanzar Tiempo
```bash
POST /api/time
{
  "action": "advance",
  "advanceMinutes": 15
}
```

#### Volver a Hora Real
```bash
POST /api/time
{
  "action": "reset"
}
```

## 🧪 Casos de Prueba

### 📊 Escenarios de Frecuencia

| Ruta | Frecuencia | Descripción |
|------|------------|-------------|
| Ruta A | `frecuenciaActual` | Configurable por administrador |
| Ruta B | `frecuenciaActual` | Configurable por administrador |
| Ruta C | `frecuenciaActual` | Típicamente 20 min, una vez al día |

### 🎯 Pruebas Recomendadas

1. **Rotación de Rutas A y B**
   - Establecer hora: 7:30
   - Verificar que A y B se intercalan
   - Probar asignación automática

2. **Ruta C (Una vez al día)**
   - Establecer hora: 8:00
   - Verificar que solo aparece una vez
   - Probar asignación automática

3. **Cambio de Frecuencia**
   - Modificar `frecuenciaActual` en base de datos
   - Verificar que se aplica inmediatamente
   - Probar rotación con nueva frecuencia

4. **Misma Ruta Consecutiva**
   - Verificar que espera `frecuenciaActual * 2` minutos
   - Probar lógica de alternancia

## 🔍 Monitoreo y Logs

### 📝 Logs del Sistema

El sistema genera logs detallados cuando está en modo simulación:

```
=== HORA ACTUAL DEL SISTEMA: 15/1/2024, 08:30:45 ===
Hora actual (ISO): 2024-01-15T13:30:45.123Z
Hora actual (local): 08:30:45
🕐 MODO SIMULACIÓN ACTIVO - Hora simulada: 15/1/2024, 08:30:45
```

### 📊 Indicadores Visuales

- **Verde**: Hora real del sistema
- **Naranja**: Modo simulación activo
- **Badge**: Muestra el estado actual

## ⚠️ Consideraciones Importantes

### 🔒 Seguridad

- El modo simulación solo afecta a los cálculos de enrutamiento
- No modifica la base de datos ni los registros históricos
- Se resetea automáticamente al reiniciar el servidor

### 🎯 Uso Recomendado

- **Solo para pruebas**: No usar en producción
- **Resetear después**: Volver a hora real después de las pruebas
- **Documentar cambios**: Anotar qué escenarios se probaron

### 🔄 Persistencia

- La hora simulada se mantiene durante la sesión del servidor
- Se pierde al reiniciar el servidor
- No se guarda en base de datos

## 🛠️ Desarrollo

### 📁 Archivos Principales

```
src/lib/timeService.ts          # Servicio de tiempo
src/components/ui/TimeController.tsx  # Componente UI
app/api/time/route.ts           # API endpoint
scripts/test-hora-simulada.js   # Script CLI
app/test-hora-simulada/page.tsx # Página de prueba
```

### 🔧 Modificaciones del FrecuenciaCalculator

El `FrecuenciaCalculator` ahora usa `TimeService.getCurrentTime()` en lugar de `new Date()`:

```typescript
// Antes
const ahora = new Date();

// Ahora
const ahora = TimeService.getCurrentTime();
```

### 🧪 Página de Prueba

Accede a `/test-hora-simulada` para una interfaz completa de pruebas con:

- Controlador de hora
- Información en tiempo real
- Pruebas de enrutamiento
- Logs del sistema

## 🎉 Beneficios

1. **Pruebas Realistas**: Simular diferentes escenarios de demanda
2. **Validación de Lógica**: Verificar comportamiento en horas específicas
3. **Desarrollo Eficiente**: No esperar a horas específicas para probar
4. **Documentación**: Probar y documentar casos edge
5. **Calidad**: Mejorar la robustez del sistema

## 📞 Soporte

Para problemas o preguntas sobre el sistema de hora simulada:

1. Revisar los logs del servidor
2. Verificar que el servidor esté ejecutándose
3. Comprobar la conexión a la API
4. Resetear a hora real si hay problemas

---

**¡El sistema de hora simulada está listo para hacer tus pruebas de enrutamiento más eficientes! 🚀** 