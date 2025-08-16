import { getSession } from '@/src/lib/session'
import { Users, Bus, Route, Clock, FileText, Settings, Activity, Shield, ArrowRight } from 'lucide-react'
import RouteGuard from '@/src/components/RouteGuard'

export default async function AdminPage() {
    const session = await getSession()

    if (!session) {
        return <div>No Está Autenticado</div>
    }

    const features = [
        {
            icon: Clock,
            title: 'Gestión de Turnos',
            description: 'Asigna y gestiona turnos de transporte de manera eficiente',
            color: 'blue',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-600'
        },
        {
            icon: Bus,
            title: 'Flota de Vehículos',
            description: 'Administra automóviles, conductores y sus asignaciones',
            color: 'green',
            bgColor: 'bg-green-100',
            textColor: 'text-green-600'
        },
        {
            icon: Route,
            title: 'Rutas Optimizadas',
            description: 'Define y gestiona rutas con prioridades y horarios',
            color: 'purple',
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-600'
        },
        {
            icon: FileText,
            title: 'Reportes Detallados',
            description: 'Genera informes y estadísticas de operaciones',
            color: 'orange',
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-600'
        },
        {
            icon: Shield,
            title: 'Sistema de Sanciones',
            description: 'Control de sanciones para conductores y vehículos',
            color: 'red',
            bgColor: 'bg-red-100',
            textColor: 'text-red-600'
        },
        {
            icon: Settings,
            title: 'Configuración Avanzada',
            description: 'Personaliza parámetros del sistema según necesidades',
            color: 'gray',
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600'
        }
    ]

    const quickAccess = [
        {
            icon: Clock,
            title: 'Turnos',
            description: 'Gestionar turnos de transporte',
            color: 'blue',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
            borderColor: 'border-blue-200'
        },
        {
            icon: Bus,
            title: 'Vehículos',
            description: 'Administrar flota de vehículos',
            color: 'green',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
            borderColor: 'border-green-200'
        },
        {
            icon: Users,
            title: 'Conductores',
            description: 'Gestionar personal conductor',
            color: 'purple',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
            borderColor: 'border-purple-200'
        },
        {
            icon: FileText,
            title: 'Reportes',
            description: 'Generar informes del sistema',
            color: 'orange',
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-600',
            borderColor: 'border-orange-200'
        }
    ]

    return (
        <RouteGuard requiredPermission="tablaUsuario">
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
                                <p className="text-gray-600 mt-1">Bienvenido al sistema de gestión de transporte EnRuta</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Activity className="w-5 h-5" />
                                <span>EnRuta System</span>
                            </div>
                        </div>
                    </div>

                    {/* Mensaje de Bienvenida */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-sm p-6 mb-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-lg">
                                <Activity className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-1">
                                    ¡Bienvenido, {session.nombre}! 👋
                                </h2>
                                <p className="text-blue-100">
                                    Sistema de Gestión de Transporte EnRuta
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Descripción del Sistema */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                                <Bus className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Sistema de Gestión de Transporte EnRuta</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    <strong>EnRuta</strong> es una plataforma integral de gestión de transporte diseñada para optimizar 
                                    la operación de flotas de vehículos. Nuestro sistema permite la asignación inteligente de turnos, 
                                    gestión de conductores y vehículos, control de rutas, y generación de reportes detallados para 
                                    mejorar la eficiencia operativa.
                                </p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {features.map((feature, index) => (
                                <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className={`p-2 ${feature.bgColor} rounded-lg flex-shrink-0`}>
                                        <feature.icon className={`w-5 h-5 ${feature.textColor}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-800 mb-1">{feature.title}</h4>
                                        <p className="text-sm text-gray-600">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Información del Usuario y Permisos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Información del Usuario */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Información de Usuario</h3>
                                    <p className="text-gray-600 text-sm">Datos de tu cuenta en el sistema</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Nombre:</span>
                                    <span className="font-medium text-gray-900">{session.nombre}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Usuario:</span>
                                    <span className="font-medium text-gray-900">{session.usuario}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-600">Estado:</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        session.activo 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {session.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Permisos de Acceso */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-gray-100 rounded-lg flex-shrink-0">
                                    <Shield className="w-6 h-6 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Permisos de Acceso</h3>
                                    <p className="text-gray-600 text-sm">Funcionalidades disponibles según tu rol</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                {Object.entries(session).map(([key, value]) => {
                                    if (key.startsWith('tabla') && typeof value === 'boolean') {
                                        const permissionName = key.replace('tabla', '').toLowerCase()
                                        return (
                                            <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                                <span className="text-gray-600 capitalize">{permissionName}:</span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    value 
                                                        ? 'bg-blue-100 text-blue-800' 
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {value ? 'Permitido' : 'Denegado'}
                                                </span>
                                            </div>
                                        )
                                    }
                                    return null
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Acceso Rápido */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-purple-100 rounded-lg flex-shrink-0">
                                <Settings className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Acceso Rápido</h3>
                                <p className="text-gray-600 text-sm">
                                    Utiliza el menú lateral para acceder a todas las funcionalidades del sistema. 
                                    Cada sección está protegida según tus permisos de acceso.
                                </p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {quickAccess.map((item, index) => (
                                <div key={index} className={`text-center p-4 ${item.bgColor} border ${item.borderColor} rounded-lg hover:shadow-md transition-shadow cursor-pointer group`}>
                                    <item.icon className={`w-8 h-8 ${item.textColor} mx-auto mb-2 group-hover:scale-110 transition-transform`} />
                                    <p className="text-sm font-medium text-gray-800 mb-1">{item.title}</p>
                                    <p className="text-xs text-gray-600">{item.description}</p>
                                    <ArrowRight className={`w-4 h-4 ${item.textColor} mx-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </RouteGuard>
    )
}