'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { Users, Bus, UserCog, Menu, X, Calendar,
  CircleOff, Ban, RefreshCw, Clock, Settings, Route, FileText, Activity, UserCheck
 } from "lucide-react"
import { useState, useEffect } from "react"
import LogoutButton from "./ui/LogoutBuuton"

interface MenuItem {
  name: string
  href: string
  icon: string
  avalaible?: boolean
}

interface SidebarClientProps {
  menuItems?: MenuItem[]
}

// Mapeo de nombres de iconos a componentes
const iconMap = {
  Users,
  Bus,
  UserCog,
  Calendar,
  CircleOff,
  Ban,
  RefreshCw,
  Clock,
  Settings,
  Route,
  FileText,
  Activity,
  UserCheck
}

export default function SidebarClient({ menuItems = [] }: SidebarClientProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isActiveRoute = (href: string) => {
    if (!mounted) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  if (!menuItems || menuItems.length === 0) {
    return (
      <>
        {/* Botón hamburguesa para móviles */}
        <button
          onClick={toggleMenu}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>

        {/* Overlay para cerrar menú */}
        {isOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeMenu}
          />
        )}

        {/* Sidebar móvil */}
        <aside className={`
          md:w-60 w-80 h-screen bg-gradient-to-b from-slate-50 to-white shadow-xl border-r border-gray-200/50 flex flex-col fixed z-50 transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="flex items-center justify-between p-4 border-b border-gray-100 md:hidden">
            <div className="flex items-center gap-3">
              <Image 
                src="/logoEnRutaNegro.png"
                width={40}
                height={40}
                alt="EnRuta Logo"
                className="rounded-lg"
              />
              <h1 className="text-lg font-bold text-gray-800">EnRuta</h1>
            </div>
            <button
              onClick={closeMenu}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <Header />
          <nav className="flex-1 px-3 py-3 space-y-1">
            <div className="flex items-center justify-center h-20">
              <p className="text-gray-500 text-sm">No tienes permisos de acceso</p>
            </div>
          </nav>
          <Footer />
        </aside>
      </>
    )
  }

  return (
    <>
      {/* Botón hamburguesa para móviles */}
      <button
        onClick={toggleMenu}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Overlay para cerrar menú */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        md:w-60 w-80 h-screen bg-gradient-to-b from-slate-50 to-white shadow-xl border-r border-gray-200/50 flex flex-col fixed z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 md:hidden">
          <div className="flex items-center gap-3">
            <Image 
              src="/logoEnRutaNegro.png"
              width={40}
              height={40}
              alt="EnRuta Logo"
              className="rounded-lg"
            />
            <h1 className="text-lg font-bold text-gray-800">EnRuta</h1>
          </div>
          <button
            onClick={closeMenu}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <Header />
        <nav className="flex-1 px-3 py-3 space-y-1">
          {menuItems.map(({ name, href, icon }) => {
            const Icon = iconMap[icon as keyof typeof iconMap]
            const isActive = isActiveRoute(href)

            // Verificar que el icono existe
            if (!Icon) {
              console.warn(`Icono no encontrado: ${icon}`)
              return null
            }

            return (
              <Link
                key={name}
                href={href}
                onClick={closeMenu}
                className={`
                  group relative flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ease-in-out
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02]' 
                    : 'text-gray-700 hover:bg-white hover:shadow-md hover:text-gray-900 hover:transform hover:scale-[1.01]'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-sm"></div>
                )}
                <div className={`
                  p-1 rounded-lg transition-all duration-200
                  ${isActive ? 'bg-white/20' : 'group-hover:bg-gray-100'}
                `}>
                  <Icon className={`
                    w-4 h-4 transition-all duration-200
                    ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'}
                  `} />
                </div>
                <span className={`
                  text-xs transition-all duration-200
                  ${isActive ? 'text-white font-semibold' : 'text-gray-700 group-hover:text-gray-900'}
                `}>
                  {name}
                </span>
                {!isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-sm"></div>
                )}
              </Link>
            )
          })}
        </nav>
        <Footer />
      </aside>
    </>
  )
}

function Header() {
  return (
    <div className="p-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm hidden md:block">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Image 
            src="/logoEnRutaNegro.png"
            width={40}
            height={40}
            alt="EnRuta Logo"
            className="rounded-lg shadow-sm"
          />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        </div>
        <div className="hidden md:block">
          <h1 className="text-base font-bold text-gray-800">EnRuta</h1>
          <p className="text-xs text-gray-500">Panel</p>
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <div className="border-t border-gray-100 bg-white/50 backdrop-blur-sm">
      {/* Botón de Cerrar Sesión */}
      <div className="p-3">
        <LogoutButton />
      </div>
      
      {/* Información de copyright */}
      <div className="p-3 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>© 2025 EnRuta</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">v1.0.0</p>
      </div>
    </div>
  )
}
