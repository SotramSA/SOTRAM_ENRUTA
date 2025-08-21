'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, Edit, Trash2, User, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import axios from 'axios'
import { useNotifications, createApiNotifications } from '@/src/lib/notifications'
import RouteGuard from '@/src/components/RouteGuard'

interface Conductor {
  id: number
  nombre: string
  cedula: string
  telefono?: string
  correo?: string
  observaciones?: string
  licenciaConduccion?: Date | null
  activo: boolean
  conductorAutomovil: {
    id: number
    automovil: {
      id: number
      movil: string
      placa: string
    }
  }[]
}

interface Automovil {
  id: number
  movil: string
  placa: string
  activo: boolean
}

interface FormData {
  nombre: string
  cedula: string
  telefono: string
  correo: string
  observaciones: string
  activo: boolean
  licenciaConduccion?: string
  automoviles: number[]
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ConductorManager() {
  const notifications = useNotifications()
  const apiNotifications = createApiNotifications(notifications)
  
  const [conductores, setConductores] = useState<Conductor[]>([])
  const [automoviles, setAutomoviles] = useState<Automovil[]>([])
  const [form, setForm] = useState<FormData>({ 
    nombre: '', 
    cedula: '', 
    telefono: '', 
    correo: '', 
    observaciones: '', 
    activo: true, 
    licenciaConduccion: '',
    automoviles: [] 
  })
  const [editId, setEditId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewItem, setViewItem] = useState<Conductor | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [automovilFilter, setAutomovilFilter] = useState('')

  useEffect(() => {
    fetchConductores()
    fetchAutomoviles()
  }, [pagination.page, searchTerm])

  async function fetchConductores() {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm
      })
      
      const res = await axios.get(`/api/conductores?${params}`)
      setConductores(res.data.conductores)
      setPagination(prev => ({
        ...prev,
        total: res.data.total,
        totalPages: res.data.totalPages
      }))
    } catch (error) {
      apiNotifications.fetchError('conductores')
    }
  }

  async function fetchAutomoviles() {
    try {
      const res = await axios.get('/api/automoviles?limit=1000&activo=true')
      setAutomoviles(res.data.automoviles || [])
    } catch (error) {
      console.error('Error al cargar automóviles:', error)
      setAutomoviles([])
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      if (editId) {
        await axios.put(`/api/conductores/${editId}`, form)
        apiNotifications.updateSuccess('Conductor')
      } else {
        await axios.post('/api/conductores', form)
        apiNotifications.createSuccess('Conductor')
      }
      
      setForm({ 
        nombre: '', 
        cedula: '', 
        telefono: '', 
        correo: '', 
        observaciones: '', 
        activo: true, 
        licenciaConduccion: '',
        automoviles: [] 
      })
      setEditId(null)
      setIsModalOpen(false)
      fetchConductores()
    } catch (error) {
      if (editId) {
        apiNotifications.updateError('conductor')
      } else {
        apiNotifications.createError('conductor')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: number) {
    setIsLoading(true)
    try {
      await axios.delete(`/api/conductores/${id}`)
      apiNotifications.deleteSuccess('Conductor')
      fetchConductores()
    } catch (error) {
      apiNotifications.deleteError('conductor')
    } finally {
      setIsLoading(false)
      setDeleteId(null)
    }
  }

  function handleEdit(conductor: Conductor) {
    const automovilesIds = conductor.conductorAutomovil.map(ca => ca.automovil.id)
    
    // Convertir la fecha de licencia de conducción al formato requerido por el input date
    let licenciaConduccionFormatted = ''
    if (conductor.licenciaConduccion) {
      const fecha = new Date(conductor.licenciaConduccion)
      licenciaConduccionFormatted = fecha.toISOString().split('T')[0] // Formato YYYY-MM-DD
    }
    
    setForm({ 
      nombre: conductor.nombre, 
      cedula: conductor.cedula, 
      telefono: conductor.telefono || '',
      correo: conductor.correo || '',
      observaciones: conductor.observaciones || '',
      activo: conductor.activo,
      licenciaConduccion: licenciaConduccionFormatted,
      automoviles: automovilesIds
    })
    setEditId(conductor.id)
    setIsModalOpen(true)
  }

  function openNewModal() {
    setForm({ 
      nombre: '', 
      cedula: '', 
      telefono: '', 
      correo: '', 
      observaciones: '', 
      activo: true, 
      licenciaConduccion: '',
      automoviles: [] 
    })
    setEditId(null)
    setIsModalOpen(true)
  }

  function handlePageChange(newPage: number) {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  function handleModalClose() {
    setIsModalOpen(false)
    setForm({ 
      nombre: '', 
      cedula: '', 
      telefono: '', 
      correo: '', 
      observaciones: '', 
      activo: true,
      licenciaConduccion: '',
      automoviles: [] 
    })
    setEditId(null)
    setAutomovilFilter('')
  }

  function handleAutomovilToggle(automovilId: number) {
    setForm(prev => ({
      ...prev,
      automoviles: prev.automoviles.includes(automovilId)
        ? prev.automoviles.filter(id => id !== automovilId)
        : [...prev.automoviles, automovilId]
    }))
  }

  function handleView(conductor: Conductor) {
    console.log('🔍 Abriendo modal de visualización para conductor:', conductor);
    setViewItem(conductor);
    setIsViewModalOpen(true);
  }

  function handleViewModalClose() {
    console.log('🔍 Cerrando modal de visualización');
    setIsViewModalOpen(false);
    setViewItem(null);
  }

  // Filtrar automóviles basado en el texto de búsqueda
  const filteredAutomoviles = automoviles.filter(auto => 
    auto.activo && 
    (auto.movil.toLowerCase().includes(automovilFilter.toLowerCase()) ||
     auto.placa.toLowerCase().includes(automovilFilter.toLowerCase()))
  )

  return (
    <RouteGuard requiredPermission="tablaConductor">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Conductores</h1>
                <p className="text-gray-600 mt-1">Administra los conductores del sistema</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <User className="w-5 h-5" />
                <span>Conductores</span>
              </div>
            </div>
          </div>

          {/* Buscador */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Buscar Conductores</h2>
              <button
                onClick={openNewModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={16} />
                Agregar Conductor
              </button>
            </div>
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o cédula..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Buscar
              </button>
            </form>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Correo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Automóviles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conductores.map((conductor) => (
                    <tr key={conductor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{conductor.nombre}</div>
                          <div className="text-sm text-gray-500">C.C. {conductor.cedula}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {conductor.correo || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {conductor.telefono || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {conductor.conductorAutomovil.length > 0 ? (
                            conductor.conductorAutomovil.map((ca) => (
                              <span
                                key={ca.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                              >
                                <User size={12} />
                                {ca.automovil.movil}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">Sin automóviles</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          conductor.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {conductor.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(conductor)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleView(conductor)}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded transition-colors cursor-pointer"
                            title="Ver"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteId(conductor.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {conductores.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-gray-400">
                            <User size={48} />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                              No hay conductores registrados
                            </h3>
                            <p className="text-gray-500 mb-4">
                              Comienza agregando el primer conductor al sistema
                            </p>
                            <button
                              onClick={openNewModal}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer mx-auto"
                            >
                              <Plus size={16} />
                              Agregar Primer Conductor
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginador */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} resultados
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de formulario */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 bg-gray-400/50 flex items-center justify-center z-50 p-4"
            onClick={handleModalClose}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editId ? 'Editar Conductor' : 'Nuevo Conductor'}
                </h2>
                <button
                  onClick={handleModalClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  {/* <X size={24} /> */}
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Primera fila - 2 columnas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      required
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre completo"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cédula
                    </label>
                    <input
                      type="text"
                      required
                      value={form.cedula}
                      onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Número de cédula"
                    />
                  </div>
                </div>

                {/* Segunda fila - 2 columnas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Número de teléfono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de vencimiento de licencia
                    </label>
                    <input
                      type="date"
                      value={form.licenciaConduccion || ''}
                      onChange={(e) => setForm({ ...form, licenciaConduccion: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Tercera fila - 1 columna */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Correo electrónico"
                  />
                </div>

                {/* Observaciones - ancho completo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Observaciones adicionales"
                    rows={3}
                  />
                </div>

                {/* Checkbox activo */}
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Conductor activo
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Automóviles asignados
                  </label>
                  
                  {/* Filtro de búsqueda para automóviles */}
                  <div className="mb-3">
                    <input
                      type="text"
                      value={automovilFilter}
                      onChange={(e) => setAutomovilFilter(e.target.value)}
                      placeholder="Buscar por móvil o placa..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Lista de automóviles filtrados */}
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-2">
                    {filteredAutomoviles.length > 0 ? (
                      filteredAutomoviles.map((automovil) => (
                        <label key={automovil.id} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.automoviles.includes(automovil.id)}
                            onChange={() => handleAutomovilToggle(automovil.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {automovil.movil} ({automovil.placa})
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
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    {isLoading ? 'Guardando...' : (editId ? 'Actualizar' : 'Crear')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {deleteId && (
          <div 
            className="fixed inset-0 bg-gray-400/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteId(null)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 p-6 border-b border-gray-200">
                <div className="flex-shrink-0">
                  {/* <AlertTriangle className="h-6 w-6 text-red-600" /> */}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirmar eliminación
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    ¿Estás seguro de que quieres eliminar este conductor? Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 p-6">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {isLoading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de visualización */}
        {isViewModalOpen && viewItem && (
          <div 
            className="fixed inset-0 bg-gray-400/50 flex items-center justify-center z-50 p-4"
            onClick={handleViewModalClose}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Detalles del Conductor - {viewItem.nombre}
                </h2>
                <button
                  onClick={handleViewModalClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información Personal</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium text-gray-700">Nombre:</span> <span className="text-gray-900">{viewItem.nombre}</span></p>
                      <p><span className="font-medium text-gray-700">Cédula:</span> <span className="text-gray-900">{viewItem.cedula}</span></p>
                      <p><span className="font-medium text-gray-700">Teléfono:</span> <span className="text-gray-900">{viewItem.telefono || 'No registrado'}</span></p>
                      <p><span className="font-medium text-gray-700">Correo:</span> <span className="text-gray-900">{viewItem.correo || 'No registrado'}</span></p>
                      <p>
                        <span className="font-medium text-gray-700">Estado:</span> 
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                          viewItem.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {viewItem.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Documentos</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium text-gray-700">Licencia de Conducción:</span> <span className="text-gray-900">
                        {viewItem.licenciaConduccion ? (() => {
                          try {
                            return new Date(viewItem.licenciaConduccion).toLocaleDateString('es-ES')
                          } catch {
                            return 'Fecha inválida'
                          }
                        })() : 'No registrada'}
                      </span></p>
                    </div>
                  </div>
                </div>

                                 {/* Observaciones */}
                 <div className="space-y-3">
                   <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Observaciones</h3>
                   <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                     {viewItem.observaciones || 'Sin observaciones registradas'}
                   </p>
                 </div>

                {/* Automóviles asignados */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Automóviles Asignados</h3>
                  {viewItem.conductorAutomovil.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {viewItem.conductorAutomovil.map((ca) => (
                        <span
                          key={ca.id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          <User size={14} />
                          {ca.automovil.movil} ({ca.automovil.placa})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No hay automóviles asignados</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleViewModalClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  )
}
