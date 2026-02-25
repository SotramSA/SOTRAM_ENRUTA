# Configuración de Base de Datos - EnRuta

## ⚠️ CRÍTICO: Parámetros de Conexión PostgreSQL

Para que la aplicación funcione correctamente en **PRODUCCIÓN**, la variable de entorno `DATABASE_URL` **DEBE INCLUIR** parámetros de pool de conexiones.

### Formato Correcto de DATABASE_URL

```
postgresql://usuario:password@host:5432/base_datos?connection_limit=10&pool_timeout=20&connect_timeout=60&idle_timeout=300
```

### Parámetros Requeridos

| Parámetro | Valor Recomendado | Descripción |
|-----------|------------------|-------------|
| `connection_limit` | 10 | Máximo de conexiones simultáneas por instancia |
| `pool_timeout` | 20 | Timeout en segundos para obtener conexión del pool |
| `connect_timeout` | 60 | Timeout en segundos para conectar a la BD |
| `idle_timeout` | 300 | Timeout en segundos para conexiones inactivas (5 min) |

### ¿Por Qué es Importante?

1. **Sin parámetros de pool**: Las conexiones nunca se cierran, agotando rápidamente los límites del servidor
2. **El login falla primero**: Porque es el endpoint más usado, consume todas las conexiones disponibles
3. **El resto funciona**: Porque usa menos conexiones simultáneamente

### Ejemplo de URL Completa

Para Render.com:
```
postgresql://sotram:S0tram.2025@190.159.9.80:5432/db_enruta?connection_limit=10&pool_timeout=20&connect_timeout=60&idle_timeout=300
```

Para localhost (desarrollo):
```
postgresql://postgres:password@localhost:5432/en_ruta?connection_limit=20&pool_timeout=20
```

## Configuración de Prisma

El archivo `lib/prisma.ts` está configurado para:

- ✅ Usar variables globales en desarrollo (evita múltiples instancias)
- ✅ Registrar queries en desarrollo (`log: ['query']`)
- ✅ NO desconectar en endpoints (la conexión es compartida del pool)
- ✅ Reutilizar conexiones en producción

## Estructura de Conexión

```typescript
// Archivo único de entrada: @/lib/prisma.ts
import prisma from '@/lib/prisma'
```

**NUNCA MÁS:**
- `import { prisma } from '@/src/lib/prisma'` ❌ (archivo eliminado)
- `import prisma from '@/lib/prismaClient'` ⚠️ (solo para fallover, no usar en producción)

## Changelog

### Versión 1.1 (25/02/2026)
- ✅ Eliminado archivo duplicado `src/lib/prisma.ts`
- ✅ Estandarizado import en 40+ archivos API
- ✅ Removido `$disconnect()` de todos los endpoints (causa agotamiento de pool)
- ✅ Actualizado `lib/prisma.ts` como fuente única de verdad

## Troubleshooting

### "Error de conexión" en producción
1. Verifica que DATABASE_URL tenga los parámetros de pool
2. Asegúrate de que no hay `$disconnect()` en los endpoints (ya no hay)
3. Reinicia la aplicación

### "Usuario no existe" en login
- Verificar que la base de datos está accesible
- Verificar DATABASE_URL_PRIMARY o DATABASE_URL
- Revisar logs en servidor

### Demasiadas conexiones
- Aumentar `connection_limit` en DATABASE_URL
- Revisar si hay memoria leak en la aplicación
- Verificar que no hay múltiples instancias de Prisma
