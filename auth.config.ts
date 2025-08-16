
import Credentials from "next-auth/providers/credentials"
import { loginSchema } from "./src/lib/zod";
import { prisma } from "./src/lib/prisma";
import bcrypt from "bcryptjs";

export default {
    providers: [
        Credentials({
          credentials: {
            usuario: { label: "Usuario", type: "text" },
            password: { label: "Contraseña", type: "password" }
          },
          authorize: async (credentials) => {
            try {
              const {data,success} = loginSchema.safeParse(credentials)

              if(!success){
                console.error('Error de validación:', data)
                throw new Error('Credenciales Inválidas')
              }
              
              //Verificar si existe el usuario en la base de datos
              const user = await prisma.usuario.findFirst({
                where: {
                  usuario: data.usuario
                }
              })

              if(!user){
                console.error('Usuario no encontrado:', data.usuario)
                throw new Error('Usuario no existe')
              }

              //Verificar si la contraseña es correcta
              const isValid = await bcrypt.compare(data.password, user.password!)

              if(!isValid){
                console.error('Contraseña incorrecta para usuario:', data.usuario)
                throw new Error('Contraseña incorrecta')
              }
              
              console.log('Usuario autenticado exitosamente:', user.usuario)
              return {
                ...user,
                id: user.id.toString()
              };
            } catch (error) {
              console.error('Error en authorize:', error)
              throw error
            }
          },
        }),
      ],
    callbacks: {
        jwt: async ({ token, user }) => {
            if (user) {
                token.id = user.id
                token.nombre = user.nombre
                token.usuario = user.usuario
                token.activo = user.activo
                token.tablaConductor = user.tablaConductor
                token.tablaAutomovil = user.tablaAutomovil
                token.tablaRuta = user.tablaRuta
                token.tablaConductorAutomovil = user.tablaConductorAutomovil
                token.tablaTurno = user.tablaTurno
                token.tablaPlanilla = user.tablaPlanilla
                token.tablaSancionConductor = user.tablaSancionConductor
                token.tablaSancionAutomovil = user.tablaSancionAutomovil
                token.tablaFecha = user.tablaFecha
                token.tablaUsuario = user.tablaUsuario
                token.tablaConfiguracion = user.tablaConfiguracion
                token.tablaInformes = user.tablaInformes
                token.tablaPropietarios = user.tablaPropietarios
                token.tablaProgramada = user.tablaProgramada
            }
            return token
        },
        session: async ({ session, token }) => {
            if (token) {
                session.user.id = token.id as string
                session.user.nombre = token.nombre as string
                session.user.usuario = token.usuario as string
                session.user.activo = token.activo as boolean
                session.user.tablaConductor = token.tablaConductor as boolean
                session.user.tablaAutomovil = token.tablaAutomovil as boolean
                session.user.tablaRuta = token.tablaRuta as boolean
                session.user.tablaConductorAutomovil = token.tablaConductorAutomovil as boolean
                session.user.tablaTurno = token.tablaTurno as boolean
                session.user.tablaPlanilla = token.tablaPlanilla as boolean
                session.user.tablaSancionConductor = token.tablaSancionConductor as boolean
                session.user.tablaSancionAutomovil = token.tablaSancionAutomovil as boolean
                session.user.tablaFecha = token.tablaFecha as boolean
                session.user.tablaUsuario = token.tablaUsuario as boolean
                session.user.tablaConfiguracion = token.tablaConfiguracion as boolean
                session.user.tablaInformes = token.tablaInformes as boolean
                session.user.tablaPropietarios = token.tablaPropietarios as boolean
                session.user.tablaProgramada = token.tablaProgramada as boolean
            }
            return session
        }
    }
}