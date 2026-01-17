'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/Card'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Label } from '@/src/components/ui/Label'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { 
  Calendar, 
  Clock, 
  Car, 
  Users, 
  TrendingUp, 
  Activity,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useNotifications } from '@/src/lib/notifications'
import RouteGuard from '@/src/components/RouteGuard'

interface DashboardData {
  demandaPorHora: Array<{ hora: number; cantidad: number }>
  tiempoPromedioMinutos: number
  automovilesActivos: Array<{
    id: number
    movil: string
    placa: string
    turnosAsignados: number
  }>
  conductoresActivos: Array<{
    id: number
    nombre: string
    cedula: string
    turnosAsignados: number
  }>
  balanceRutas: Array<{
    nombre: string
    cantidadTurnos: number
  }>
  balanceTodasRutas: Array<{
    nombre: string
    cantidadTurnos: number
  }>
  balanceRutasPorUsuario: {
    [usuarioNombre: string]: Array<{
      rutaNombre: string
      cantidadTurnos: number
    }>
  }
  metricasGenerales: {
    totalTurnos: number
    turnosNoCompletados: number
    turnosCompletados: number
  }
  fechaInicio: string
  fechaFin: string
}

export default function DashboardPage() {
  const notifications = useNotifications()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  // Establecer fechas por defecto (fecha actual)
  useEffect(() => {
    const hoy = new Date()
    const fechaActual = hoy.toISOString().split('T')[0] // Formato YYYY-MM-DD
    setFechaInicio(fechaActual)
    setFechaFin(fechaActual)
  }, [])

  // Cargar datos cuando cambien las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      cargarDatos()
    }
  }, [fechaInicio, fechaFin])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`)
      if (response.ok) {
        const dashboardData = await response.json()

        setData(dashboardData)
      } else {
        notifications.error('Error al cargar los datos del dashboard')
      }
    } catch (error) {
      console.error('Error:', error)
      notifications.error('Error al cargar los datos del dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatearHora = (hora: number) => {
    return `${hora.toString().padStart(2, '0')}:00`
  }

  const formatearTiempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60)
    const mins = Math.round(minutos % 60)
    return `${horas}h ${mins}m`
  }

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  if (loading) {
    return (
      <RouteGuard requiredPermission="tablaInformes">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Cargando dashboard...</p>
</div>
      </div>
    </RouteGuard>
  )
}

  return (
    <RouteGuard requiredPermission="tablaInformes">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Métricas y análisis del sistema de turnos</p>
              </div>
              <Button
                onClick={cargarDatos}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>

          {/* Filtros de fecha */}
          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Filtros de Fecha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="fechaFin">Fecha Fin</Label>
                  <Input
                    id="fechaFin"
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {data && (
            <>
              {/* Métricas Generales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Turnos</p>
                        <p className="text-2xl font-bold text-gray-900">{data.metricasGenerales.totalTurnos}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Activity className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">No Completados</p>
                        <p className="text-2xl font-bold text-yellow-600">{data.metricasGenerales.turnosNoCompletados}</p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completados</p>
                        <p className="text-2xl font-bold text-green-600">{data.metricasGenerales.turnosCompletados}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
{/* 1. Horarios con más demanda */}
                <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Demanda por Hora
                    </CardTitle>
                    <CardDescription>
                      Horarios con más solicitudes de turnos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.demandaPorHora}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="hora" 
                          tickFormatter={formatearHora}
                          label={{ value: 'Hora del día', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis label={{ value: 'Turnos solicitados', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          labelFormatter={(value) => `Hora: ${formatearHora(Number(value))}`}
                          formatter={(value) => [`${value} turnos`, 'Solicitudes']}
                        />
                        <Bar dataKey="cantidad" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 2. Tiempo promedio de turno */}
                <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Tiempo Promedio de Turno
                    </CardTitle>
                    <CardDescription>
                      Tiempo desde solicitud hasta salida
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {formatearTiempo(data.tiempoPromedioMinutos)}
                        </div>
                        <p className="text-gray-600">Promedio de espera</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rankings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* 3. Automóviles más activos */}
                <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="w-5 h-5" />
                      Automóviles Más Activos
                    </CardTitle>
                    <CardDescription>
                      Ranking por turnos asignados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.automovilesActivos.slice(0, 5).map((automovil, index) => (
                        <div key={automovil.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 
                              index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Móvil {automovil.movil}</p>
                              <p className="text-sm text-gray-600">{automovil.placa}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600">{automovil.turnosAsignados}</p>
                            <p className="text-xs text-gray-500">turnos</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Conductores más activos */}
                <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Conductores Más Activos
                    </CardTitle>
                    <CardDescription>
                      Ranking por turnos asignados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.conductoresActivos.slice(0, 5).map((conductor, index) => (
                        <div key={conductor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 
                              index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{conductor.nombre}</p>
                              <p className="text-sm text-gray-600">{conductor.cedula}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{conductor.turnosAsignados}</p>
                            <p className="text-xs text-gray-500">turnos</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

{/* 5. Balance entre rutas A y B */}
              <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Balance de Rutas Prioritarias
                  </CardTitle>
                  <CardDescription>
                    Distribución de turnos entre rutas A y B (prioridad 1)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="min-h-[350px]">
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={data.balanceRutas}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ nombre, cantidadTurnos }) => `${nombre}: ${cantidadTurnos}`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="cantidadTurnos"
                          >
                            {data.balanceRutas.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} turnos`, 'Cantidad']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="flex flex-col justify-center space-y-4">
                      {data.balanceRutas.map((ruta, index) => (
                        <div key={ruta.nombre} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div 
                              className="w-5 h-5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">Ruta {ruta.nombre}</p>
                              <p className="text-sm text-gray-600">Prioridad 1</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                              {ruta.cantidadTurnos}
                            </p>
                            <p className="text-xs text-gray-500">turnos</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 6. Balance de todas las rutas */}
              <Card className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Balance de Todas las Rutas
                  </CardTitle>
                  <CardDescription>
                    Distribución de turnos entre todas las rutas del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="min-h-[400px]">
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={data.balanceTodasRutas.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="nombre" 
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            interval={0}
                            label={{ value: 'Rutas', position: 'insideBottom', offset: -80 }}
                          />
                          <YAxis label={{ value: 'Turnos', angle: -90, position: 'insideLeft' }} />
                          <Tooltip 
                            formatter={(value) => [`${value} turnos`, 'Cantidad']}
                          />
                          <Bar dataKey="cantidadTurnos" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="flex flex-col space-y-3">
                      <div className="max-h-[400px] overflow-y-auto pr-2">
                        {data.balanceTodasRutas.map((ruta, index) => (
                          <div key={ruta.nombre} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                                index === 0 ? 'bg-yellow-500' : 
                                index === 1 ? 'bg-gray-400' : 
                                index === 2 ? 'bg-orange-500' : 'bg-green-500'
                              }`}>
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">Ruta {ruta.nombre}</p>
                                <p className="text-sm text-gray-600">Todas las rutas</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <p className="text-2xl font-bold text-green-600">
                                {ruta.cantidadTurnos}
                              </p>
                              <p className="text-xs text-gray-500">turnos</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 7. Balance de rutas por usuario */}
              {data.balanceRutasPorUsuario && Object.keys(data.balanceRutasPorUsuario).length > 0 && (
                <Card className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Balance de Rutas por Usuario
                    </CardTitle>
                    <CardDescription>
                      Distribución de rutas despachadas por cada usuario en el período seleccionado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                      {Object.entries(data.balanceRutasPorUsuario).map(([usuarioNombre, rutas]) => (
                        <div key={usuarioNombre} className="bg-white border border-gray-200 rounded-lg p-6">
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{usuarioNombre}</h3>
                            <p className="text-sm text-gray-600">
                              {rutas.reduce((total, ruta) => total + (ruta.cantidadTurnos || 0), 0)} turnos despachados
                            </p>
                          </div>
                          
                          <div className="min-h-[250px]">
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart 
                                data={rutas}
                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="rutaNombre" 
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                  interval={0}
                                  tick={{ fontSize: 12 }}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip 
                                  formatter={(value) => [`${value} turnos`, 'Cantidad']}
                                  labelFormatter={(label) => `Ruta: ${label}`}
                                />
                                <Bar 
                                  dataKey="cantidadTurnos" 
                                  fill="#3B82F6" 
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                            {[...rutas]
                              .sort((a, b) => (b.cantidadTurnos || 0) - (a.cantidadTurnos || 0))
                              .map((ruta, index) => (
                              <div key={`${usuarioNombre}-ruta-${ruta.rutaNombre || index}`} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                                    index === 0 ? 'bg-yellow-500' : 
                                    index === 1 ? 'bg-gray-400' : 
                                    index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <span className="text-gray-700 truncate">{ruta.rutaNombre || 'Sin nombre'}</span>
                                </div>
                                <span className="font-medium text-gray-900">{ruta.cantidadTurnos || 0}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </RouteGuard>
  )
}
