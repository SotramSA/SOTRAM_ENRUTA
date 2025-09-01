'use client'
import { LogOut } from "lucide-react"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const LogoutButton = () => {
    const router = useRouter()
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/simple-logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (response.ok) {
                // Limpiar cualquier estado local si es necesario
                localStorage.removeItem('user')
                sessionStorage.clear()
                
                // Redirigir al login
                router.push('/login')
                router.refresh()
            } else {
                console.error('Error al cerrar sesión')
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error)
            // Aún así, redirigir al login
            router.push('/login')
        }
    }

    // Renderizar un placeholder durante la hidratación
    if (!isClient) {
        return (
            <div className="group w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ease-in-out text-red-600">
                <div className="p-1 rounded-lg transition-all duration-200 group-hover:bg-red-100">
                    <LogOut className="w-4 h-4" />
                </div>
                <span className="text-xs">Cerrar Sesión</span>
            </div>
        )
    }

    return (
        <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ease-in-out text-red-600 hover:bg-red-50 hover:text-red-700 hover:shadow-md hover:transform hover:scale-[1.01] cursor-pointer"
        >
            <div className="p-1 rounded-lg transition-all duration-200 group-hover:bg-red-100">
                <LogOut className="w-4 h-4" />
            </div>
            <span className="text-xs">Cerrar Sesión</span>
        </button>
    )
}

export default LogoutButton