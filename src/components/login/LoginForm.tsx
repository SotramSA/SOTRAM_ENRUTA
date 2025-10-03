'use client'

import { Mail, Lock } from 'lucide-react';
import { loginSchema } from '@/src/lib/zod';

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod';
import { loginAction } from '@/actions/auth_action';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import Image from 'next/image'


export default function LoginForm() {

    const [error, setError] = useState<string | null>(null)
    const [isPeding, startTransition] = useTransition()
    const router = useRouter()

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            usuario: '',
            password: ''
        }
    })

    async function onSubmit(values: z.infer<typeof loginSchema>) {

        startTransition(async () => {
            try {
                // Usar fetch directo a la ruta simple de login
                const response = await fetch('/api/auth/simple-login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(values),
                });

                const result = await response.json();

                if (!response.ok) {
                    setError(result.error || 'Error de autenticación');
                } else {
                    router.push('/admin');
                }
            } catch (error) {
                console.error('Error en login:', error);
                setError('Error de conexión');
            }
        })
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100
            flex justify-center items-center">
            <div className="max-w-md w-full">
                <div className=" bg-white rounded-2xl shadow-xl p-8">

                    <div className='flex flex-col justify-center items-center'>

                        <div className='bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full
                                        '>
                            <Image
                                src='/logoEnRutaBlanco.png'
                                width={120}
                                height={120}
                                alt='Logo EnRuta'
                                className='rounded-full'
                            />
                        </div>

                        <p className='mt-4 text-2xl font-bold text-gray-800'>Iniciar Sesión</p>
                        <p className='text-sm text-gray-600 mt-2'>Ingresa a tu cuenta</p>
                    </div>

                    <div className='flex flex-col gap-2 mt-8'>
                        <label className='text-sm font-semibold text-gray-700' htmlFor="usuario">Usuario</label>
                        <div className='relative'>
                            <div className='absolute inset-y-4 left-0 pl-3 flex item-center
                            pointer-events-none'>
                                <Mail className='h-5 w-5 text-gray-400' />
                            </div>
                            <input
                                id='usuario'
                                {...form.register('usuario')}
                                className='border w-full pl-10 pr-3 py-3 rounded-lg border-gray-300
                                focus:border-blue-500 transition-colors'
                                placeholder='tu Usuario'
                            />
                            {form.formState.errors.usuario && (
                                <p className='text-red-500 text-sm mt-1'>{form.formState.errors.usuario.message}</p>
                            )}
                        </div>

                    </div>


                    <div className='flex flex-col gap-2 mt-8'>
                        <label className='text-sm font-semibold text-gray-700' htmlFor="password">Contraseña</label>
                        <div className='relative'>
                            <div className='absolute inset-y-4 left-0 pl-3 flex item-center
                            pointer-events-none'>
                                <Lock className='h-5 w-5 text-gray-400' />
                            </div>
                            <input type="password"
                                id='password'
                                {...form.register('password')}
                                className='border w-full pl-10 pr-3 py-3 rounded-lg border-gray-300
                                focus:border-blue-500 transition-colors'
                                placeholder='••••••••'
                            />
                            {form.formState.errors.password && (
                                <p className='text-red-500 text-sm mt-1'>{form.formState.errors.password.message}</p>
                            )}
                        </div>

                    </div>

                    {error && (
                        <div className="bg-red-400 p-2 rounded-sm text-white
                         text-sm font-semibold text-center mt-4 border-l-6 border-red-700">
                            {error}
                        </div>
                    )}



                    <button
                        disabled={isPeding}
                        type='submit'
                        className={`w-full bg-gradient-to-r from-${'blue-500'} to-${'indigo-600'}
                        text-white font-semibold text-sm p-3 rounded-lg mt-5 cursor-pointer`}>
                        Ingresar Sesión
                    </button>

                </div>
            </div>
        </form>
    )
}
