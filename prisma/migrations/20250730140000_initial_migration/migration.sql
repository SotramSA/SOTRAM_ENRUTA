-- CreateTable
CREATE TABLE "Conductor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automovil" (
    "id" SERIAL NOT NULL,
    "movil" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Automovil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruta" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "frecuenciaMin" INTEGER NOT NULL,
    "frecuenciaMax" INTEGER NOT NULL,
    "frecuenciaDefault" INTEGER NOT NULL,
    "frecuenciaActual" INTEGER NOT NULL,
    "unaVezDia" BOOLEAN NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "descripcion" TEXT,
    "fechaCreacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "prioridad" INTEGER DEFAULT 0,

    CONSTRAINT "Ruta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConductorAutomovil" (
    "id" SERIAL NOT NULL,
    "automovilId" INTEGER NOT NULL,
    "conductorId" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ConductorAutomovil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" SERIAL NOT NULL,
    "movilId" INTEGER NOT NULL,
    "conductorId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaSalida" TIMESTAMP(3) NOT NULL,
    "rutaId" INTEGER,
    "horaCreacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT DEFAULT 'PENDIENTE',

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SancionConductor" (
    "id" SERIAL NOT NULL,
    "conductorId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,

    CONSTRAINT "SancionConductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SancionAutomovil" (
    "id" SERIAL NOT NULL,
    "automovilId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,

    CONSTRAINT "SancionAutomovil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planilla" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "movilId" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Planilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tablaConductor" BOOLEAN NOT NULL DEFAULT false,
    "tablaAutomovil" BOOLEAN NOT NULL DEFAULT false,
    "tablaRuta" BOOLEAN NOT NULL DEFAULT false,
    "tablaConductorAutomovil" BOOLEAN NOT NULL DEFAULT false,
    "tablaTurno" BOOLEAN NOT NULL DEFAULT false,
    "tablaPlanilla" BOOLEAN NOT NULL DEFAULT false,
    "tablaSancionConductor" BOOLEAN NOT NULL DEFAULT false,
    "tablaSancionAutomovil" BOOLEAN NOT NULL DEFAULT false,
    "tablaFecha" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuario" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "tablaUsuario" BOOLEAN NOT NULL DEFAULT false,
    "tablaConfiguracion" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" SERIAL NOT NULL,
    "frecuenciaAutomatica" BOOLEAN NOT NULL DEFAULT true,
    "tiempoMinimoSalida" INTEGER NOT NULL DEFAULT 2,
    "tiempoMaximoTurno" INTEGER NOT NULL DEFAULT 45,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ruta_nombre_key" ON "Ruta"("nombre");

-- AddForeignKey
ALTER TABLE "ConductorAutomovil" ADD CONSTRAINT "ConductorAutomovil_automovilId_fkey" FOREIGN KEY ("automovilId") REFERENCES "Automovil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConductorAutomovil" ADD CONSTRAINT "ConductorAutomovil_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_movilId_fkey" FOREIGN KEY ("movilId") REFERENCES "Automovil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "Ruta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SancionConductor" ADD CONSTRAINT "SancionConductor_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SancionAutomovil" ADD CONSTRAINT "SancionAutomovil_automovilId_fkey" FOREIGN KEY ("automovilId") REFERENCES "Automovil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planilla" ADD CONSTRAINT "Planilla_movilId_fkey" FOREIGN KEY ("movilId") REFERENCES "Automovil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;