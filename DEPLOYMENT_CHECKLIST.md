# 🎯 PLAN DE ACCIÓN INMEDIATO - Deploy Producción

## ✅ YA COMPLETADO EN EL CÓDIGO

### 1. **Removida la causa raíz del error**
```
✅ 11 endpoints sin $disconnect()
✅ 40 archivos con imports estandarizados  
✅ 1 archivo duplicado eliminado
✅ 1 archivo configurado correctamente
```

---

## 🚀 LO QUE DEBES HACER AHORA

### PASO 1: Actualizar DATABASE_URL (CRÍTICO)

```bash
# Ve a tu servidor/panel de Vercel/Render y actualiza:

ANTES:
postgresql://sotram:S0tram.2025@190.159.9.80:5432/db_enruta

DESPUÉS:
postgresql://sotram:S0tram.2025@190.159.9.80:5432/db_enruta?connection_limit=10&pool_timeout=20&connect_timeout=60&idle_timeout=300
```

**Si usas Render.com:**
- Dashboard → tu aplicación → Environment
- Edita DATABASE_URL_PRIMARY (o DATABASE_URL)
- Añade los parámetros al final
- Deploy automático

**Si usas Vercel:**
- Settings → Environment Variables
- Busca DATABASE_URL
- Edita y añade parámetros
- Re-deploy

---

### PASO 2: Hacer Push del Código

```bash
git add .
git commit -m "Fix: Estandarizar Prisma imports y remover \$disconnect() de endpoints"
git push origin main
```

Esto triggereará un redeploy automático.

---

### PASO 3: Verificar Deploy

Una vez desplegado, prueba en el servidor:

```bash
# Opción 1: Desde browser
https://tu-dominio.com/login
# Intenta login, debe funcionar

# Opción 2: Desde terminal
curl -X POST https://tu-dominio.com/api/auth/simple-login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"maicolrincon93","password":"123456"}'

# Respuesta esperada:
{"success":true,"user":{"id":...,"usuario":"maicolrincon93",...},"sessionData":{...}}
```

---

## 📊 RESUMEN DE CAMBIOS

| Categoría | Detalles |
|-----------|----------|
| **Archivos Modificados** | 42 archivos |
| **Archivos Eliminados** | 1 (`src/lib/prisma.ts`) |
| **Documentación Añadida** | 2 guías completas |
| **$disconnect() removido de** | 11 endpoints API |
| **Imports estandarizados en** | 40+ archivos |
| **Errores de compilación** | 0 ✅ |

---

## ⚠️ IMPORTANTE

### No hacer estos cambios:
- ❌ NO edites más `src/lib/prisma.ts` (eliminado)
- ❌ NO uses `import prismaWithRetry` en endpoints sin retry lógica
- ❌ NO hagas `$disconnect()` en endpoints de API

### Debe mantener:
- ✅ `import prisma from '@/lib/prisma'` en todos lados
- ✅ Connection pool parameters en DATABASE_URL
- ✅ Sin desconexiones en endpoints

---

## 🔍 VERIFICACIÓN POST-DEPLOY (Checklist)

- [ ] DATABASE_URL tiene parámetros de pool
- [ ] Login funciona en primer intento
- [ ] Login funciona en intentos posteriores (sin "connection error")
- [ ] Otros endpoints funcionan normalmente
- [ ] Logs no muestran mensajes de "connection exhausted"
- [ ] `src/lib/prisma.ts` no existe

---

## 📞 Si Algo Falla

### "Connection error" en login aún después de deploy
1. Verifica que DATABASE_URL se actualizó en el servidor (no en local)
2. Reinicia la aplicación en el servidor
3. Revisa logs del servidor para ver el valor de DATABASE_URL

### "Too many connections"
1. Reduce `connection_limit` de 10 a 5 (o aumenta en base de datos)
2. Verifica que no hay memoria leak (múltiples instancias de Prisma)

### Imports incompletos
1. Ejecuta: `npm run prisma:generate`
2. Verifica que no hay referencias a `@/src/lib/prisma`

---

## 📚 ARCHIVOS DE REFERENCIA

- [DATABASE_CONFIG.md](DATABASE_CONFIG.md) - Guía completa de configuración
- [SOLUCION_LOGIN_ERROR.md](SOLUCION_LOGIN_ERROR.md) - Análisis detallado del problema
- [lib/prisma.ts](lib/prisma.ts) - Punto único de entrada para Prisma

---

**Status:** ✅ Código listo para producción  
**Fecha:** 25/02/2026  
**Próximo paso:** Actualizar DATABASE_URL y hacer deploy
