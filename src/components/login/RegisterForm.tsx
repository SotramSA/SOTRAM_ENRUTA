'use client'


import { registerSchema } from '@/src/lib/zod';

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod';
import { registerAction } from '@/actions/auth_action';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import Image from 'next/image'



export default function RegisterForm() {

    const [error, setError] = useState<string | null>(null)
    const [isPeding, startTransition] = useTransition()
    const router = useRouter()

    const form = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            nombre: '',
            usuario: '',
            password: '',
            tablaAutomovil: false,
            tablaConductor: false,
            tablaConductorAutomovil: false,
            tablaFecha: false,
            tablaPlanilla: false,
            tablaRuta: false,
            tablaSancionAutomovil: false,
            tablaSancionConductor: false,
            tablaTurno: false
        }
    })

    async function onSubmit(values: z.infer<typeof registerSchema>) {

        startTransition(async () => {
            const response = await registerAction(values)
            if (response.error) {
                setError(response.error)
            } else {
                router.push('/admin')
            }
        })
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center items-center p-4">
          <div className="w-full max-w-4xl">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 lg:p-12">
      
              <div className='flex flex-col justify-center items-center mb-8'>
                <div className='bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full'>
                  <Image
                      src='/logoEnRutaBlanco.png'
                      width={120}
                      height={120}
                      alt='Logo EnRuta'
                      className='rounded-full'
                  />
                </div>
                <p className='mt-4 text-2xl font-bold text-gray-800'>Registro de Usuario</p>
                <p className='text-sm text-gray-600 mt-2'>Crea una cuenta nueva</p>
              </div>
      
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna izquierda - Información básica */}
                <div className="space-y-6">
                  {/* Nombre */}
                  <div className='flex flex-col gap-2'>
                    <label htmlFor="nombre" className='text-sm font-semibold text-gray-700'>Nombre</label>
                    <input
                      id='nombre'
                      {...form.register('nombre')}
                      className='border w-full px-3 py-3 rounded-lg border-gray-300 focus:border-blue-500 transition-colors'
                      placeholder='Nombre completo'
                    />
                    {form.formState.errors.nombre && (
                      <p className='text-red-500 text-sm mt-1'>{form.formState.errors.nombre.message}</p>
                    )}
                  </div>
          
                  {/* Usuario */}
                  <div className='flex flex-col gap-2'>
                    <label htmlFor="usuario" className='text-sm font-semibold text-gray-700'>Usuario</label>
                    <input
                      id='usuario'
                      {...form.register('usuario')}
                      className='border w-full px-3 py-3 rounded-lg border-gray-300 focus:border-blue-500 transition-colors'
                      placeholder='Nombre de usuario'
                    />
                    {form.formState.errors.usuario && (
                      <p className='text-red-500 text-sm mt-1'>{form.formState.errors.usuario.message}</p>
                    )}
                  </div>
          
                  {/* Contraseña */}
                  <div className='flex flex-col gap-2'>
                    <label htmlFor="password" className='text-sm font-semibold text-gray-700'>Contraseña</label>
                    <input
                      type="password"
                      id='password'
                      {...form.register('password')}
                      className='border w-full px-3 py-3 rounded-lg border-gray-300 focus:border-blue-500 transition-colors'
                      placeholder='••••••••'
                    />
                    {form.formState.errors.password && (
                      <p className='text-red-500 text-sm mt-1'>{form.formState.errors.password.message}</p>
                    )}
                  </div>
                </div>

                {/* Columna derecha - Permisos */}
                <div className="space-y-6">
                  <div>
                    <p className='text-gray-700 font-semibold mb-4 text-lg'>Permisos de acceso:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { label: 'Automóviles', name: 'tablaAutomovil' },
                        { label: 'Conductores', name: 'tablaConductor' },
                        { label: 'Conductor-Automóvil', name: 'tablaConductorAutomovil' },
                        { label: 'Fechas', name: 'tablaFecha' },
                        { label: 'Planillas', name: 'tablaPlanilla' },
                        { label: 'Rutas', name: 'tablaRuta' },
                        { label: 'Sanción Automóvil', name: 'tablaSancionAutomovil' },
                        { label: 'Sanción Conductor', name: 'tablaSancionConductor' },
                        { label: 'Turnos', name: 'tablaTurno' },
                      ].map(({ label, name }) => (
                        <label key={name} className="flex items-center justify-between border px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                          <span className="text-gray-700 text-sm font-medium">{label}</span>
                          <input type="checkbox" {...form.register(name as keyof z.infer<typeof registerSchema>)} className="form-checkbox h-5 w-5 text-blue-600 rounded" />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
      
              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-400 p-3 rounded-lg text-white text-sm font-semibold text-center mt-6 border-l-4 border-red-700">
                  {error}
                </div>
              )}
      
              {/* Botón */}
              <button
                disabled={isPeding}
                type='submit'
                className={`w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm p-4 rounded-lg mt-6 cursor-pointer hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}>
                {isPeding ? 'Registrando...' : 'Registrar Usuario'}
              </button>
      
            </div>
          </div>
        </form>
      )
      
}
