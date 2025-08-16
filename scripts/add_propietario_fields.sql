-- Agregar campos al modelo Conductor
ALTER TABLE "Conductor" ADD COLUMN "telefono" TEXT;
ALTER TABLE "Conductor" ADD COLUMN "correo" TEXT;
ALTER TABLE "Conductor" ADD COLUMN "observaciones" TEXT;

-- Crear tabla Propietario
CREATE TABLE "Propietario" (
    "id" SERIAL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "telefono" TEXT,
    "correo" TEXT,
    "observaciones" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true
);

-- Agregar campo propietarioId a Automovil
ALTER TABLE "Automovil" ADD COLUMN "propietarioId" INTEGER;
ALTER TABLE "Automovil" ADD CONSTRAINT "Automovil_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Propietario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Agregar campo tablaPropietarios a Usuario
ALTER TABLE "Usuario" ADD COLUMN "tablaPropietarios" BOOLEAN NOT NULL DEFAULT false;
