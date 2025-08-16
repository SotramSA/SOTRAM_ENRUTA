-- Script para agregar configuración de impresora y relación de usuario
-- Ejecutar este script manualmente en la base de datos

-- 1. Agregar campos de configuración de impresora
ALTER TABLE "Configuracion" 
ADD COLUMN "impresoraHabilitada" BOOLEAN DEFAULT false,
ADD COLUMN "impresionDirecta" BOOLEAN DEFAULT false,
ADD COLUMN "nombreImpresora" TEXT;

-- 2. Agregar campo usuarioId al turno
ALTER TABLE "Turno" 
ADD COLUMN "usuarioId" INTEGER;

-- 3. Agregar foreign key para la relación usuario-turno
ALTER TABLE "Turno" 
ADD CONSTRAINT "Turno_usuarioId_fkey" 
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL;

-- 4. Actualizar la configuración existente para habilitar la impresora por defecto
UPDATE "Configuracion" 
SET "impresoraHabilitada" = false, 
    "impresionDirecta" = false, 
    "nombreImpresora" = NULL
WHERE "id" = 1;

-- Si no existe configuración, crear una
INSERT INTO "Configuracion" (
    "frecuenciaAutomatica", 
    "tiempoMinimoSalida", 
    "tiempoMaximoTurno", 
    "activo", 
    "impresoraHabilitada", 
    "impresionDirecta", 
    "nombreImpresora", 
    "fechaCreacion", 
    "fechaActualizacion"
) 
SELECT 
    true, 2, 45, true, false, false, NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Configuracion" WHERE "id" = 1); 