// app/components/sidebar/Sidebar.tsx
import { getSession } from "@/src/lib/session"
import SidebarClient from "./SidebarClient"

export default async function Sidebar() {
  const session = await getSession()
 
 
  const menuItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: 'Activity',
      avalaible: session?.tablaFecha
    },
    {
      name: 'Turnos',
      href: '/turnos',
      icon: 'Clock',
      avalaible: session?.tablaTurno
    },
    {
      name: "Programado",
      href: "/programado",
      icon: "Calendar",
      avalaible: session?.tablaProgramada,
    },
    {
      name: 'Planillas',
      href: '/planillas',
      icon: 'Calendar',
      avalaible: session?.tablaPlanilla
    },
    {
      name: 'Sanciones Conductor',
      href: '/sancionConductor',
      icon: 'Ban',
      avalaible: session?.tablaSancionConductor
    },
    {
      name: 'Sanciones Automóvil',
      href: '/sancionAutomovil',
      icon: 'CircleOff',
      avalaible: session?.tablaSancionAutomovil
    },
    {
      name: "Conductores",
      href: "/conductores",
      icon: "Users",
      avalaible: session?.tablaConductor,
    },
    {
      name: "Autómoviles",
      href: "/automoviles",
      icon: "Bus",
      avalaible: session?.tablaAutomovil,
    },
    {
      name: "Inspecciones",
      href: "/inspecciones",
      icon: "ClipboardCheck",
      avalaible: session?.tablaInspeccion,
    },
    {
      name: "Propietarios",
      href: "/propietarios",
      icon: "UserCheck",
      avalaible: session?.tablaPropietarios,
    },
    {
      name: "Despacho",
      href: "/rutas",
      icon: "Route",
      avalaible: session?.tablaRuta,
    },
    {
      name: "Fila de Espera",
      href: "/admin/fila-espera",
      icon: "Users2",
      avalaible: session?.tablaRuta, // Mismo permiso que Despacho
    },
    {
      name: "Usuarios",
      href: "/usuarios",
      icon: "UserCog",
      avalaible: session?.tablaUsuario,
    },
    {
      name: "Informes",
      href: "/informes",
      icon: "FileText",
      avalaible: session?.tablaFecha, // Mismo permiso que Dashboard
    },
    {
      name: "Configuración",
      href: "/configuracion",
      icon: "Settings",
      avalaible: session?.tablaTurno, // Mismo permiso que Turnos
    }, 
  ]

  // Filtrar ítems con permisos
  const filteredItems = menuItems.filter(item => item.avalaible)

  return <SidebarClient menuItems={filteredItems} />
}
