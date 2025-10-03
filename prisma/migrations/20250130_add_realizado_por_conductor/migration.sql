-- AlterTable
ALTER TABLE "Programacion" ADD COLUMN "realizadoPorConductorId" INTEGER;

-- AddForeignKey
ALTER TABLE "Programacion" ADD CONSTRAINT "Programacion_realizadoPorConductorId_fkey" FOREIGN KEY ("realizadoPorConductorId") REFERENCES "Conductor"("id") ON DELETE SET NULL ON UPDATE CASCADE;