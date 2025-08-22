'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/Card'
import { Button } from '@/src/components/ui/Button'
import { Input } from '@/src/components/ui/Input'
import { Label } from '@/src/components/ui/Label'
import { Calendar, Download, FileText, Loader2, Users, Bus, AlertTriangle, Car, Search, UserCheck } from 'lucide-react'
import RouteGuard from '@/src/components/RouteGuard'

export default function InformesPage() {
  const [fecha, setFecha] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingReport, setLoadingReport] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleGenerarInformeTurnos = async () => {
    if (!fecha) {
      alert('Por favor selecciona una fecha')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/informes/generar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fecha }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 404) {
          throw new Error(`No se encontraron turnos para la fecha ${fecha}. Verifica que la fecha sea correcta y que existan turnos registrados para ese día.`)
        }
        throw new Error(errorData.error || 'Error al generar el informe')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `informe-turnos-${fecha}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      alert('Informe de turnos generado y descargado exitosamente')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al generar el informe')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerarReporte = async (tipo: string) => {
    setLoadingReport(tipo)
    try {
      const response = await fetch(`/api/informes/${tipo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error al generar el reporte de ${getReportName(tipo)}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-${tipo}-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      alert(`Reporte de ${getReportName(tipo)} generado y descargado exitosamente`)
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Error al generar el reporte')
    } finally {
      setLoadingReport(null)
    }
  }

  const getReportName = (tipo: string) => {
    const names: { [key: string]: string } = {
      'conductores': 'Lista de Conductores',
      'vehiculos': 'Lista de Vehículos',
      'propietarios': 'Lista de Propietarios',
      'sanciones-conductores': 'Sanciones de Conductores',
      'sanciones-vehiculos': 'Sanciones de Vehículos'
    }
    return names[tipo] || tipo
  }

  const reportes = [
    {
      id: 'conductores',
      titulo: 'Lista de Conductores',
      descripcion: 'Reporte completo de todos los conductores registrados con sus vehículos asignados',
      icono: Users,
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      buttonColor: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
      buttonDisabled: 'disabled:bg-blue-400'
    },
    {
      id: 'vehiculos',
      titulo: 'Lista de Vehículos',
      descripcion: 'Reporte completo de todos los vehículos registrados con sus conductores asignados',
      icono: Bus,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      buttonColor: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
      buttonDisabled: 'disabled:bg-green-400'
    },
    {
      id: 'propietarios',
      titulo: 'Lista de Propietarios',
      descripcion: 'Reporte completo de todos los propietarios registrados con sus vehículos asignados',
      icono: UserCheck,
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
      buttonColor: 'bg-purple-600',
      buttonHover: 'hover:bg-purple-700',
      buttonDisabled: 'disabled:bg-purple-400'
    },
    {
      id: 'sanciones-conductores',
      titulo: 'Sanciones de Conductores',
      descripcion: 'Reporte de todas las sanciones aplicadas a conductores',
      icono: AlertTriangle,
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-600',
      buttonColor: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
      buttonDisabled: 'disabled:bg-red-400'
    },
    {
      id: 'sanciones-vehiculos',
      titulo: 'Sanciones de Vehículos',
      descripcion: 'Reporte de todas las sanciones aplicadas a vehículos',
      icono: Car,
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
      buttonColor: 'bg-orange-600',
      buttonHover: 'hover:bg-orange-700',
      buttonDisabled: 'disabled:bg-orange-400'
    }
  ]

  // Filtrar reportes por búsqueda
  const reportesFiltrados = reportes.filter(reporte =>
    reporte.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reporte.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <RouteGuard requiredPermission="tablaFecha">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Informes</h1>
                <p className="text-gray-600 mt-1">Genera reportes detallados de todas las operaciones del sistema</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FileText className="w-5 h-5" />
                <span>Reportes del Sistema</span>
              </div>
            </div>
          </div>

          {/* Buscador de Reportes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar reportes por nombre o descripción..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Reportes Generales */}
          {reportesFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {reportesFiltrados.map((reporte) => (
                <div key={reporte.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 ${reporte.bgColor} rounded-lg flex-shrink-0`}>
                      <reporte.icono className={`w-6 h-6 ${reporte.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{reporte.titulo}</h3>
                      <p className="text-gray-600 text-sm mb-4">{reporte.descripcion}</p>
                      <button 
                        onClick={() => handleGenerarReporte(reporte.id)}
                        disabled={loadingReport === reporte.id}
                        className={`w-full ${reporte.buttonColor} ${reporte.buttonHover} ${reporte.buttonDisabled} text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer`}
                      >
                        
                        {loadingReport === reporte.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Descargar Excel
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron reportes</h3>
              <p className="text-gray-600">
                No hay reportes que coincidan con tu búsqueda &quot;{searchTerm}&quot;.
              </p>
            </div>
          )}

          {/* Informe de Turnos por Fecha */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-purple-100 rounded-lg flex-shrink-0">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Informe de Turnos por Fecha</h3>
                <p className="text-gray-600 text-sm">
                  Genera un reporte Excel con todos los turnos de una fecha específica, organizados por ruta en hojas separadas
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha" className="text-sm font-medium text-gray-700">Fecha del Reporte</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleGenerarInformeTurnos}
                  disabled={isLoading || !fecha}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generar y Descargar Excel
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Información de los Reportes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-gray-100 rounded-lg flex-shrink-0">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Información de los Reportes</h3>
                <p className="text-gray-600 text-sm">
                  Detalles sobre el contenido y formato de cada tipo de reporte disponible
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Reportes Generales:</h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                  <li><strong>Lista de Conductores:</strong> ID, nombre, cédula, estado, vehículos asignados</li>
                  <li><strong>Lista de Vehículos:</strong> ID, móvil, placa, estado, conductores asignados</li>
                  <li><strong>Sanciones de Conductores:</strong> Conductor, tipo de sanción, descripción, fecha, estado</li>
                  <li><strong>Sanciones de Vehículos:</strong> Vehículo, tipo de sanción, descripción, fecha, estado</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Informe de Turnos:</h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                  <li>ID del turno</li>
                  <li>Hora de solicitud de turno (extraída de la fecha de creación)</li>
                  <li>Hora de salida (solo la hora, sin fecha)</li>
                  <li>Número del móvil y placa</li>
                  <li>Nombre del conductor y cédula</li>
                  <li>Estado del turno</li>
                  <li>Organización por rutas en hojas separadas</li>
                </ul>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  )
} 