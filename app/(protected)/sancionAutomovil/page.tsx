'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, Edit, Trash2, Car, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import { useNotifications, createApiNotifications } from '@/src/lib/notifications'
import RouteGuard from '@/src/components/RouteGuard'
import { formatDate, formatDateForInput } from '@/src/lib/utils'

interface Automovil {
  id: number
  movil: string
  placa: string
}

interface SancionAutomovil {
  id: number
  automovilId: number
  automovil: Automovil
  fechaInicio: string
  fechaFin: string
  motivo: string
}

interface FormData {
  automovilId: number
  fechaInicio: string
  fechaFin: string
  motivo: string
}

interface PaginationData {
  total: number
  totalPages: number
  page: number
  limit: number
}

export default function SancionAutomovilManager() {
  const notifications = useNotifications()
  const apiNotifications = createApiNotifications(notifications)
  
  const [sanciones, setSanciones] = useState<SancionAutomovil[]>([])
  const [automoviles, setAutomoviles] = useState<Automovil[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 10
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingSancion, setEditingSancion] = useState<SancionAutomovil | null>(null)
  const [deletingSancion, setDeletingSancion] = useState<SancionAutomovil | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    automovilId: 0,
    fechaInicio: '',
    fechaFin: '',
    motivo: ''
  })
  const [automovilFilter, setAutomovilFilter] = useState('')

  // Cargar sanciones
  const fetchSanciones = async (page = 1, search = '') => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search })
      })
      
      const res = await axios.get(`/api/sancionAutomovil?${params}`)
      setSanciones(res.data.sanciones || [])
      setPagination({
        total: res.data.total,
        totalPages: res.data.totalPages,
        page: res.data.page,
        limit: res.data.limit
      })
    } catch (error) {
      notifications.error('Error al cargar sanciones')
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar automóviles activos
  const fetchAutomoviles = async () => {
    try {
      const res = await axios.get('/api/automoviles/activos')
      console.log('Automóviles cargados:', res.data)
      setAutomoviles(res.data || [])
    } catch (error) {
      console.error('Error al cargar automóviles:', error)
      notifications.error('Error al cargar automóviles')
    }
  }

  // Manejar búsqueda
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    fetchSanciones(1, value)
  }

  // Manejar cambio de página
  const handlePageChange = (newPage: number) => {
    fetchSanciones(newPage, searchTerm)
  }

  // Abrir modal para crear
  const handleCreate = () => {
    setEditingSancion(null)
    setFormData({
      automovilId: 0,
      fechaInicio: '',
      fechaFin: '',
      motivo: ''
    })
    setAutomovilFilter('')
    setIsModalOpen(true)
  }

  // Abrir modal para editar
  const handleEdit = (sancion: SancionAutomovil) => {
    setEditingSancion(sancion)
    setFormData({
      automovilId: sancion.automovilId,
      fechaInicio: formatDateForInput(sancion.fechaInicio),
      fechaFin: formatDateForInput(sancion.fechaFin),
      motivo: sancion.motivo
    })
    setAutomovilFilter('')
    setIsModalOpen(true)
  }

  // Abrir modal para eliminar
  const handleDelete = (sancion: SancionAutomovil) => {
    setDeletingSancion(sancion)
    setIsDeleteModalOpen(true)
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.automovilId) {
      notifications.error('Debe seleccionar un automóvil')
      return
    }
    
    if (!formData.fechaInicio || !formData.fechaFin) {
      notifications.error('Debe completar las fechas de inicio y fin')
      return
    }
    
    if (new Date(formData.fechaInicio) > new Date(formData.fechaFin)) {
      notifications.error('La fecha de fin debe ser posterior a la fecha de inicio')
      return
    }
    
    if (!formData.motivo.trim()) {
      notifications.error('Debe ingresar un motivo')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingSancion) {
        await axios.put(`/api/sancionAutomovil/${editingSancion.id}`, formData)
        apiNotifications.updateSuccess('Sanción')
      } else {
        await axios.post('/api/sancionAutomovil', formData)
        apiNotifications.createSuccess('Sanción')
      }
      
      setIsModalOpen(false)
      setAutomovilFilter('')
      fetchSanciones(pagination.page, searchTerm)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar sanción'
      notifications.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (!deletingSancion) return
    
    setIsSubmitting(true)
    try {
      await axios.delete(`/api/sancionAutomovil/${deletingSancion.id}`)
      apiNotifications.deleteSuccess('Sanción')
      setIsDeleteModalOpen(false)
      setDeletingSancion(null)
      fetchSanciones(pagination.page, searchTerm)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar sanción'
      notifications.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtrar automóviles basado en el texto de búsqueda
  const filteredAutomoviles = automoviles.filter(automovil => 
    automovil.movil.toLowerCase().includes(automovilFilter.toLowerCase()) ||
    automovil.placa.toLowerCase().includes(automovilFilter.toLowerCase())
  )

  console.log('Automóviles totales:', automoviles.length)
  console.log('Automóviles filtrados:', filteredAutomoviles.length)
  console.log('Filtro aplicado:', automovilFilter)

  useEffect(() => {
    fetchSanciones()
    fetchAutomoviles()
  }, [])

  return (
    <RouteGuard requiredPermission="tablaSancionAutomovil">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Sanciones de Automóviles</h1>
                <p className="text-gray-600 mt-1">Administra las sanciones aplicadas a los automóviles</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Car className="w-5 h-5" />
                <span>Sanciones de Automóviles</span>
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Buscar por automóvil o motivo..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Nueva Sanción
              </button>
            </div>
          </div>

          {/* Mensaje de estado */}
          {/* Tabla */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Automóvil
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Inicio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Fin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                          Cargando sanciones...
                        </div>
                      </td>
                    </tr>
                  ) : sanciones.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No se encontraron sanciones
                      </td>
                    </tr>
                  ) : (
                    sanciones.map((sancion) => (
                      <tr key={sancion.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Móvil: {sancion.automovil.movil}
                            </div>
                            <div className="text-sm text-gray-500">
                              Placa: {sancion.automovil.placa}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sancion.fechaInicio)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sancion.fechaFin)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {sancion.motivo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(sancion)}
                              className="text-blue-600 hover:text-blue-900 cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sancion)}
                              className="text-red-600 hover:text-red-900 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> a{' '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>{' '}
                        de <span className="font-medium">{pagination.total}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium cursor-pointer ${
                              page === pagination.page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Siguiente
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal para crear/editar */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-gray-400/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingSancion ? 'Editar Sanción' : 'Nueva Sanción'}
                  </h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Automóvil */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Automóvil *
                      </label>
                      
                      {/* Filtro de búsqueda para automóviles */}
                      <div className="mb-3">
                        <input
                          type="text"
                          value={automovilFilter}
                          onChange={(e) => setAutomovilFilter(e.target.value)}
                          placeholder="Buscar automóvil por móvil o placa..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Lista de automóviles filtrados */}
                      <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-2">
                        {filteredAutomoviles.length > 0 ? (
                          filteredAutomoviles.map((automovil) => (
                            <label key={automovil.id} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="automovilId"
                                value={automovil.id}
                                checked={formData.automovilId === automovil.id}
                                onChange={(e) => setFormData({ ...formData, automovilId: Number(e.target.value) })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                required
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                Móvil: {automovil.movil} - Placa: {automovil.placa}
                              </span>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">
                            {automovilFilter ? 'No se encontraron automóviles' : 'No hay automóviles disponibles'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Fecha Inicio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Inicio *
                      </label>
                      <input
                        type="date"
                        value={formData.fechaInicio}
                        onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Fecha Fin */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Fin *
                      </label>
                      <input
                        type="date"
                        value={formData.fechaFin}
                        onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Motivo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo *
                      </label>
                      <textarea
                        value={formData.motivo}
                        onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ingrese el motivo de la sanción..."
                        required
                      />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false)
                          setAutomovilFilter('')
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Guardando...' : (editingSancion ? 'Actualizar' : 'Crear')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Modal de confirmación de eliminación */}
          {isDeleteModalOpen && deletingSancion && (
            <div className="fixed inset-0 bg-gray-400/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Confirmar Eliminación
                  </h2>
                  <p className="text-gray-600 mb-6">
                    ¿Está seguro de que desea eliminar la sanción del automóvil{' '}
                    <strong>Móvil: {deletingSancion.automovil.movil}</strong>?
                    Esta acción no se puede deshacer.
                  </p>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmDelete}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  )
}