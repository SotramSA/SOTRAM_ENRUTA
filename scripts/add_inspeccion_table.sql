-- Crear tabla Inspeccion
-- Esta tabla almacena las inspecciones realizadas a los automóviles

CREATE TABLE IF NOT EXISTS "Inspeccion" (
    "id" SERIAL PRIMARY KEY,
    "automovilId" INTEGER NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "estado" TEXT DEFAULT 'PENDIENTE',
    "inspector" TEXT,
    CONSTRAINT "Inspeccion_automovilId_fkey" FOREIGN KEY ("automovilId") REFERENCES "Automovil"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Crear índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS "Inspeccion_automovilId_idx" ON "Inspeccion"("automovilId");
CREATE INDEX IF NOT EXISTS "Inspeccion_fechaCreacion_idx" ON "Inspeccion"("fechaCreacion");