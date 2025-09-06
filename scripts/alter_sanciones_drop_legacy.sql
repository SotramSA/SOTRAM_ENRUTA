BEGIN;

-- Conductor
ALTER TABLE "SancionConductor"
  DROP COLUMN IF EXISTS "fecha",
  DROP COLUMN IF EXISTS "monto";

-- Automóvil
ALTER TABLE "SancionAutomovil"
  DROP COLUMN IF EXISTS "fecha",
  DROP COLUMN IF EXISTS "monto";

COMMIT;
