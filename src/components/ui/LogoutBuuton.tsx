'use client'
import { LogOut } from "lucide-react"

const LogoutButton = () => {
    return (
        <a
            href="/api/auth/signout"
            className="group w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ease-in-out text-red-600 hover:bg-red-50 hover:text-red-700 hover:shadow-md hover:transform hover:scale-[1.01] cursor-pointer"
        >
            <div className="p-1 rounded-lg transition-all duration-200 group-hover:bg-red-100">
                <LogOut className="w-4 h-4" />
            </div>
            <span className="text-xs">Cerrar Sesión</span>
        </a>
    )
}

export default LogoutButton