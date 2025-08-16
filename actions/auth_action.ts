'use server'

import { prisma } from "@/src/lib/prisma";
import { loginSchema, registerSchema } from "@/src/lib/zod";
import bcrypt from "bcryptjs";
import { z} from "zod";
import { cookies } from 'next/headers';

export const loginAction = async(
    values: z.infer<typeof loginSchema>
) => {
    try{
        // Validar las credenciales directamente con Prisma
        const user = await prisma.usuario.findFirst({
            where: {
                usuario: values.usuario
            }
        })

        if (!user) {
            return { error: 'Usuario no existe' }
        }

        // Verificar la contraseña
        const isValid = await bcrypt.compare(values.password, user.password!)

        if (!isValid) {
            return { error: 'Contraseña incorrecta' }
        }

        // Si las credenciales son válidas, crear una sesión simple
        const cookieStore = await cookies()
        
        // Crear un token simple (en producción usar JWT)
                       const sessionData = {
                   id: user.id,
                   nombre: user.nombre,
                   usuario: user.usuario,
                   activo: user.activo,
                   tablaConductor: user.tablaConductor,
                   tablaAutomovil: user.tablaAutomovil,
                   tablaRuta: user.tablaRuta,
                   tablaConductorAutomovil: user.tablaConductorAutomovil,
                   tablaTurno: user.tablaTurno,
                   tablaPlanilla: user.tablaPlanilla,
                   tablaSancionConductor: user.tablaSancionConductor,
                   tablaSancionAutomovil: user.tablaSancionAutomovil,
                   tablaFecha: user.tablaFecha,
                   tablaUsuario: user.tablaUsuario,
                   tablaConfiguracion: user.tablaConfiguracion,
                   tablaInformes: user.tablaInformes,
                   tablaPropietarios: user.tablaPropietarios,
                   tablaProgramada: user.tablaProgramada
               }

        // Establecer cookie de sesión
        cookieStore.set('session', JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 días
        })

        return { success: true }
        
    }catch(error){
        console.error('Error en loginAction:', error)
        
        // Manejo de errores más robusto
        if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = (error as { message: string }).message
            return { error: errorMessage || 'Error de autenticación' }
        }
        
        return { error: 'Error interno del servidor'}
    }
}

export const registerAction = async (
    values: z.infer<typeof registerSchema>
) => {
    try{
        const {data, success} = registerSchema.safeParse(values)
        if(!success){
           return {
             error:'Data Invalida'
           }
        }
        //Verificar si el usuario ya exite
        const user = await prisma.usuario.findFirst({
            where: {
                usuario: data?.usuario
            }
        })

        if(user){
            return {
                error: 'El usuario ya existe en la base de datos, Intenta con otro'
            }
        }

        //Crear el usuario

        //hash de password
        const password = await bcrypt.hash(data.password,10)
        data.password = password

        await prisma.usuario.create({
            data: data
        })

        return {
            success: 'Usuario Creado Correctamente'
        }
        

    }catch(error){
        console.error('Error en registerAction:', error)
        
        // Manejo de errores más robusto
        if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = (error as { message: string }).message
            return { error: errorMessage || 'Error al crear usuario' }
        }
        
        return { error: 'Error interno del servidor'}
    }
}