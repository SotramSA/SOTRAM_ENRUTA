-- Migración para agregar los campos 'requerido' y 'motivo' a la tabla Conductor
-- Fecha: 2025-01-31

-- Agregar la columna 'requerido' con valor por defecto false
ALTER TABLE "Conductor" ADD COLUMN IF NOT EXISTS "requerido" BOOLEAN NOT NULL DEFAULT false;

-- Agregar la columna 'motivo' como opcional
ALTER TABLE "Conductor" ADD COLUMN IF NOT EXISTS "motivo" TEXT;

-- Comentario para documentar el propósito de estos campos
COMMENT ON COLUMN "Conductor"."requerido" IS 'Indica si el conductor está siendo requerido por alguna razón específica';
COMMENT ON COLUMN "Conductor"."motivo" IS 'Motivo por el cual el conductor está siendo requerido';