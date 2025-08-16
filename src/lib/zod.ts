import { boolean, object, string } from 'zod'

export const loginSchema = object({
  usuario: string()
    .min(1, 'Usuario obligatorio'),
  password: string()
    .min(1, 'La contraseña es obligatoria')
})

export const registerSchema = object({
  nombre: string()
    .min(1, 'Nombre Obligatorio'),
  usuario: string()
    .min(1, 'Usuario obligatorio'),
  password: string()
    .min(1, 'La contraseña es obligatoria'),
  tablaConductor: boolean(),
  tablaAutomovil: boolean(),
  tablaRuta: boolean(),
  tablaConductorAutomovil: boolean(),
  tablaTurno: boolean(),
  tablaPlanilla: boolean(),
  tablaSancionConductor: boolean(),
  tablaSancionAutomovil: boolean(),
  tablaFecha: boolean()
})
