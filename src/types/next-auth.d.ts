import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    nombre: string
    usuario: string
    password?: string | null
    activo: boolean
    tablaConductor: boolean
    tablaAutomovil: boolean
    tablaRuta: boolean
    tablaConductorAutomovil: boolean
    tablaTurno: boolean
    tablaPlanilla: boolean
    tablaSancionConductor: boolean
    tablaSancionAutomovil: boolean
    tablaFecha: boolean
    tablaUsuario: boolean
    tablaConfiguracion: boolean
    tablaInformes: boolean
    tablaPropietarios: boolean
    tablaProgramada: boolean
  }

  interface Session {
    user: User
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    nombre: string
    usuario: string
    activo: boolean
    tablaConductor: boolean
    tablaAutomovil: boolean
    tablaRuta: boolean
    tablaConductorAutomovil: boolean
    tablaTurno: boolean
    tablaPlanilla: boolean
    tablaSancionConductor: boolean
    tablaSancionAutomovil: boolean
    tablaFecha: boolean
    tablaUsuario: boolean
    tablaConfiguracion: boolean
    tablaInformes: boolean
    tablaPropietarios: boolean
    tablaProgramada: boolean
  }
} 