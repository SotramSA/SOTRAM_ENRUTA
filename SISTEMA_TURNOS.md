# Sistema de Gestión de Turnos - EnRuta

## Descripción

Este sistema implementa un control inteligente de rutas de transporte público con las siguientes características:

### Tipos de Rutas

1. **Rutas A y B (Prioritarias)**
   - Frecuencia base: 6 minutos (intercaladas)
   - Frecuencia automática ajustable según tiempo de espera
   - Se alternan automáticamente (A → B → A → B)

2. **Ruta C (Una vez al día)**
   - Frecuencia fija: 20 minutos
   - Solo un móvil puede hacerla una vez por día
   - Prioridad alta cuando está próxima a salir

3. **Ruta D (Programada)**
   - Frecuencia configurable por el administrador
   - Se programa manualmente según necesidades

### Sistema de Frecuencias Automáticas

El sistema ajusta automáticamente las frecuencias según el tiempo de espera:

- **Normal**: 6 minutos
- **+45 min de espera**: 5 minutos
- **+70 min de espera**: 4 minutos
- **+95 min de espera**: 3 minutos
- **+120 min de espera**: 2 minutos

### Reglas de Negocio

1. **Tiempo mínimo de salida**: 2 minutos después de la hora actual
2. **Alternancia de rutas**: A y B se alternan automáticamente
3. **Priorización inteligente**: 
   - Ruta C pendiente tiene prioridad alta
   - Alternancia con última ruta realizada
   - Evita repetir la misma ruta consecutivamente

## Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar base de datos

```bash
# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# Insertar rutas de ejemplo
npm run seed:rutas
```

### 3. Configurar variables de entorno

Crear archivo `.env.local` con:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/en_ruta"
NEXTAUTH_SECRET="tu-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Ejecutar el proyecto

```bash
npm run dev
```

## Uso del Sistema

### Página de Turnos (`/turno`)

1. **Seleccionar móvil y conductor**
   - El sistema solo muestra conductores asignados al móvil seleccionado

2. **Ver sugerencias de rutas**
   - El sistema muestra las mejores opciones con prioridades
   - Incluye hora de salida calculada automáticamente
   - Muestra la razón de la sugerencia

3. **Asignar turno**
   - Hacer clic en "Asignar Turno" para la ruta deseada
   - El sistema crea el turno automáticamente

4. **Visualizar turnos del día**
   - Cards organizadas por ruta
   - Muestra hora, móvil, conductor y estado
   - Actualización en tiempo real

### Página de Configuración (`/configuracion`)

1. **Frecuencia Automática**
   - Activar/desactivar ajuste automático de frecuencias
   - Configurar tiempo máximo de turno

2. **Tiempos del Sistema**
   - Ajustar tiempo mínimo de salida
   - Ver reglas de frecuencia automática

## Estructura de la Base de Datos

### Tabla `Ruta`
- `nombre`: Nombre de la ruta (A, B, C, D)
- `frecuenciaMin/Max/Default/Actual`: Configuración de frecuencias
- `unaVezDia`: Boolean para ruta C
- `prioridad`: Boolean para rutas A y B

### Tabla `Turno`
- `movilId`: ID del automóvil
- `conductorId`: ID del conductor
- `rutaId`: ID de la ruta asignada
- `horaSalida`: Hora calculada de salida
- `estado`: PENDIENTE, EN_CURSO, COMPLETADO, CANCELADO

### Tabla `Configuracion`
- `frecuenciaAutomatica`: Boolean para activar/desactivar
- `tiempoMinimoSalida`: Minutos mínimos para salir
- `tiempoMaximoTurno`: Minutos máximos antes de reducir frecuencia

## API Endpoints

### Turnos
- `GET /api/turnos` - Obtener todos los turnos del día
- `GET /api/turnos?movilId=X&conductorId=Y` - Obtener sugerencias
- `POST /api/turnos` - Crear nuevo turno
- `PUT /api/turnos/[id]` - Actualizar turno
- `DELETE /api/turnos/[id]` - Eliminar turno

### Configuración
- `GET /api/configuracion` - Obtener configuración actual
- `PUT /api/configuracion` - Actualizar configuración

### Automóviles
- `GET /api/automoviles/[id]/conductores` - Obtener conductores asignados

## Características Técnicas

- **Frontend**: Next.js 15 con TypeScript
- **Backend**: API Routes de Next.js
- **Base de datos**: PostgreSQL con Prisma ORM
- **UI**: Componentes personalizados con Tailwind CSS
- **Autenticación**: NextAuth.js
- **Estado**: React Hooks y Zustand

## Flujo de Trabajo

1. El administrador accede a `/turno`
2. Selecciona un móvil y conductor
3. El sistema calcula y muestra sugerencias de rutas
4. El administrador elige la ruta más conveniente
5. El sistema crea el turno con hora calculada automáticamente
6. Los turnos se muestran en cards organizadas por ruta
7. El sistema ajusta frecuencias automáticamente según la carga

## Mantenimiento

### Actualizar rutas
```bash
npm run seed:rutas
```

### Ver base de datos
```bash
npm run prisma:studio
```

### Generar cliente Prisma
```bash
npm run prisma:generate
```

## Notas Importantes

- El sistema garantiza que solo se asigne un turno por móvil a la vez
- Las frecuencias se ajustan automáticamente para optimizar el servicio
- La ruta C tiene prioridad cuando está próxima a salir
- El sistema evita repetir la misma ruta consecutivamente
- Todos los cálculos consideran el tiempo mínimo de salida 