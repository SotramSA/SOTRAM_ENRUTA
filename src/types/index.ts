export type LoginForm = {
    usuario: string,
    password: string
}

export type Usuario = {
    id: string,
    nombre: string,
    usuario: string,
    password?: string,
    activo: boolean,
    tablaConductor: boolean,
    tablaAutomovil: boolean,
    tablaRuta: boolean,
    tablaConductorAutomovil: boolean,
    tablaTurno: boolean,
    tablaPlanilla: boolean,
    tablaSancionConductor: boolean,
    tablaSancionAutomovil: boolean,
    tablaFecha: boolean
}