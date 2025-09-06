BEGIN;

-- Sanción de Conductor
ALTER TABLE "SancionConductor"
  ADD COLUMN IF NOT EXISTS "fechaInicio" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "fechaFin" TIMESTAMP NULL;

ALTER TABLE "SancionConductor"
  ALTER COLUMN "fecha" DROP NOT NULL;

ALTER TABLE "SancionConductor"
  ALTER COLUMN "monto" DROP NOT NULL;

UPDATE "SancionConductor"
SET "fechaInicio" = COALESCE("fechaInicio", "fecha"),
    "fechaFin" = COALESCE("fechaFin", "fecha")
WHERE "fecha" IS NOT NULL;

-- Sanción de Automóvil
ALTER TABLE "SancionAutomovil"
  ADD COLUMN IF NOT EXISTS "fechaInicio" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "fechaFin" TIMESTAMP NULL;

ALTER TABLE "SancionAutomovil"
  ALTER COLUMN "fecha" DROP NOT NULL;

ALTER TABLE "SancionAutomovil"
  ALTER COLUMN "monto" DROP NOT NULL;

UPDATE "SancionAutomovil"
SET "fechaInicio" = COALESCE("fechaInicio", "fecha"),
    "fechaFin" = COALESCE("fechaFin", "fecha")
WHERE "fecha" IS NOT NULL;

COMMIT;
