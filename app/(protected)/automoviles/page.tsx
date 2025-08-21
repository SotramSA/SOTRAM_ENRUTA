'use client'

import { useEffect, useState } from 'react'
import { Search, Plus, Edit, Trash2, Car, ChevronLeft, ChevronRight, UserCheck, Eye } from 'lucide-react'
import axios from 'axios'
import { useNotifications, createApiNotifications } from '@/src/lib/notifications'
import RouteGuard from '@/src/components/RouteGuard'

interface Automovil {
  id: number
  movil: string
  placa: string
  activo: boolean
  disponible: boolean
  soat?: string | null
  revisionTecnomecanica?: string | null
  tarjetaOperacion?: string | null
  licenciaTransito?: string | null
  extintor?: string | null
  revisionPreventiva?: string | null
  revisionAnual?: string | null
  automovilPropietario: {
    id: number
    propietario: {
      id: number
      nombre: string
      cedula: string
    }
  }[]
  conductorAutomovil: {
    id: number
    conductor: {
      id: number
      nombre: string
      cedula: string
    }
  }[]
}

interface Conductor {
  id: number
  nombre: string
  cedula: string
}

interface FormData {
  movil: string
  placa: string
  activo: boolean
  disponible: boolean
  propietarios: number[]
  conductores: number[]
  soat?: string
  revisionTecnomecanica?: string
  tarjetaOperacion?: string
  licenciaTransito?: string
  extintor?: string
  revisionPreventiva?: string
  revisionAnual?: string
}

interface Propietario {
  id: number
  nombre: string
  cedula: string
  telefono?: string | null
  correo?: string | null
  estado: boolean
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AutomovilManager() {
  const notifications = useNotifications()
  const apiNotifications = createApiNotifications(notifications)
  
  const [automoviles, setAutomoviles] = useState<Automovil[]>([])
  const [conductores, setConductores] = useState<Conductor[]>([])
  const [propietarios, setPropietarios] = useState<Propietario[]>([])
  const [propietarioFilter, setPropietarioFilter] = useState<string>('')
  const [form, setForm] = useState<FormData>({ 
    movil: '', 
    placa: '', 
    activo: true, 
    disponible: true, 
    propietarios: [],
    conductores: [], 
    soat: '', 
    revisionTecnomecanica: '', 
    tarjetaOperacion: '', 
    licenciaTransito: '', 
    extintor: '', 
    revisionPreventiva: '', 
    revisionAnual: '' 
  })
  const [editId, setEditId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewItem, setViewItem] = useState<Automovil | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [conductorFilter, setConductorFilter] = useState('')

  useEffect(() => {
    fetchAutomoviles()
    fetchConductores()
    fetchPropietarios()
  }, [pagination.page, searchTerm])

  async function fetchPropietarios() {
    try {
      const response = await axios.get('/api/propietarios')
      setPropietarios(response.data)
    } catch (error) {
      console.error('Error al cargar propietarios:', error)
    }
  }

  async function fetchAutomoviles() {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm
      })
      
      const res = await axios.get(`/api/automoviles?${params}`)
      setAutomoviles(res.data.automoviles)
      setPagination(prev => ({
        ...prev,
        total: res.data.total,
        totalPages: res.data.totalPages
      }))
    } catch (error) {
      apiNotifications.fetchError('automóviles')
    }
  }

  async function fetchConductores() {
    try {
      // Obtener todos los conductores sin paginación para el modal
      const response = await axios.get('/api/conductores?limit=1000')
      // El endpoint devuelve un objeto { conductores, total, totalPages, page, limit }
      // Necesitamos solo el array de conductores para el estado local
      setConductores(response.data.conductores)
    } catch (error) {
      console.error('Error al cargar conductores:', error)
    }
  }

  // Abre modal para crear nuevo automóvil
  function openNewModal() {
    setEditId(null)
    setForm({
      movil: '',
      placa: '',
      activo: true,
      disponible: true,
      propietarios: [],
      conductores: [],
      soat: '',
      revisionTecnomecanica: '',
      tarjetaOperacion: '',
      licenciaTransito: '',
      extintor: '',
      revisionPreventiva: '',
      revisionAnual: ''
    })
    setIsModalOpen(true)
  }

  // Cierra modal y limpia formulario
  function handleModalClose() {
    setIsModalOpen(false)
    setEditId(null)
    setForm({
      movil: '',
      placa: '',
      activo: true,
      disponible: true,
      propietarios: [],
      conductores: [],
      soat: '',
      revisionTecnomecanica: '',
      tarjetaOperacion: '',
      licenciaTransito: '',
      extintor: '',
      revisionPreventiva: '',
      revisionAnual: ''
    })
  }

  // Alterna selección de conductor
  function handleConductorToggle(conductorId: number) {
    setForm((prev) => {
      const exists = prev.conductores.includes(conductorId)
      return {
        ...prev,
        conductores: exists
          ? prev.conductores.filter((id) => id !== conductorId)
          : [...prev.conductores, conductorId],
      }
    })
  }

  // Alterna selección de propietario
  function handlePropietarioToggle(propietarioId: number) {
    setForm((prev) => {
      const exists = prev.propietarios.includes(propietarioId)
      return {
        ...prev,
        propietarios: exists
          ? prev.propietarios.filter((id) => id !== propietarioId)
          : [...prev.propietarios, propietarioId],
      }
    })
  }

  // Buscar
  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPagination((p) => ({ ...p, page: 1 }))
    fetchAutomoviles()
  }

  // Cambiar página
  function handlePageChange(newPage: number) {
    if (newPage < 1 || (pagination.totalPages && newPage > pagination.totalPages)) return
    setPagination((p) => ({ ...p, page: newPage }))
  }

  // Editar automóvil
  function handleEdit(automovil: Automovil) {
    setEditId(automovil.id)
    setForm({
      movil: automovil.movil,
      placa: automovil.placa,
      activo: automovil.activo,
      disponible: automovil.disponible,
      propietarios: automovil.automovilPropietario?.map((ap) => ap.propietario.id) || [],
      conductores: automovil.conductorAutomovil?.map((ca) => ca.conductor.id) || [],
      soat: automovil.soat ? new Date(automovil.soat).toISOString().slice(0, 10) : '',
      revisionTecnomecanica: automovil.revisionTecnomecanica ? new Date(automovil.revisionTecnomecanica).toISOString().slice(0, 10) : '',
      tarjetaOperacion: automovil.tarjetaOperacion ? new Date(automovil.tarjetaOperacion).toISOString().slice(0, 10) : '',
      licenciaTransito: automovil.licenciaTransito ? new Date(automovil.licenciaTransito).toISOString().slice(0, 10) : '',
      extintor: automovil.extintor ? new Date(automovil.extintor).toISOString().slice(0, 10) : '',
      revisionPreventiva: automovil.revisionPreventiva ? new Date(automovil.revisionPreventiva).toISOString().slice(0, 10) : '',
      revisionAnual: automovil.revisionAnual ? new Date(automovil.revisionAnual).toISOString().slice(0, 10) : '',
    })
    setIsModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const payload = {
        ...form,
        soat: form.soat ? form.soat : null,
        revisionTecnomecanica: form.revisionTecnomecanica ? form.revisionTecnomecanica : null,
        tarjetaOperacion: form.tarjetaOperacion ? form.tarjetaOperacion : null,
        licenciaTransito: form.licenciaTransito ? form.licenciaTransito : null,
        extintor: form.extintor ? form.extintor : null,
        revisionPreventiva: form.revisionPreventiva ? form.revisionPreventiva : null,
        revisionAnual: form.revisionAnual ? form.revisionAnual : null,
      }
      if (editId) {
        await axios.put(`/api/automoviles/${editId}`, payload)
        apiNotifications.updateSuccess('Automóvil')
      } else {
        await axios.post('/api/automoviles', payload)
        apiNotifications.createSuccess('Automóvil')
      }
      
      setForm({ movil: '', placa: '', activo: true, disponible: true, propietarios: [], conductores: [], soat: '', revisionTecnomecanica: '', tarjetaOperacion: '', licenciaTransito: '', extintor: '', revisionPreventiva: '', revisionAnual: '' })
      setEditId(null)
      setIsModalOpen(false)
      fetchAutomoviles()
    } catch (error) {
      if (editId) {
        apiNotifications.updateError('automóvil')
      } else {
        apiNotifications.createError('automóvil')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: number) {
    setIsLoading(true)
    try {
      await axios.delete(`/api/automoviles/${id}`)
      apiNotifications.deleteSuccess('Automóvil')
      fetchAutomoviles()
    } catch (error) {
      apiNotifications.deleteError('automóvil')
    } finally {
      setIsLoading(false)
      setDeleteId(null)
    }
  }

  // Formatea una fecha ISO a YYYY-MM-DD o devuelve '—' si es nula/vacía
  const fmtDate = (value?: string | null) => {
    try {
      if (!value) return '—'
      const d = new Date(value)
      if (isNaN(d.getTime())) return String(value)
      return d.toISOString().substring(0, 10)
    } catch {
      return String(value)
    }
  }

  // (duplicate removed)

  // Filtrar conductores basado en el texto de búsqueda
  const filteredConductores = conductores.filter(conductor => 
    conductor.nombre.toLowerCase().includes(conductorFilter.toLowerCase()) ||
    conductor.cedula.toLowerCase().includes(conductorFilter.toLowerCase())
  )
  const filteredPropietarios = propietarios.filter((p) => {
    const q = propietarioFilter.trim().toLowerCase()
    if (!q) return true
    return p.nombre.toLowerCase().includes(q) || p.cedula.toLowerCase().includes(q)
  })

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  function handleView(automovil: Automovil) {
    console.log('🔍 Abriendo modal de visualización para:', automovil);
    setViewItem(automovil);
    setIsViewModalOpen(true);
  }

  function handleViewModalClose() {
    console.log('🔍 Cerrando modal de visualización');
    setIsViewModalOpen(false);
    setViewItem(null);
  }

  return (
    <RouteGuard requiredPermission="tablaAutomovil">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Automóviles</h1>
                <p className="text-gray-600 mt-1">Administra los automóviles del sistema</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Car className="w-5 h-5" />
                <span>Automóviles</span>
              </div>
            </div>
          </div>

          {/* Buscador */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Buscar Automóviles</h2>
              <button
                onClick={openNewModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Plus size={16} />
                Agregar Automóvil
              </button>
            </div>
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por móvil o placa..."
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

          {/* Mensaje de estado */}
          {/* Tabla */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Móvil
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Placa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disponible
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Propietarios
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conductores
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {automoviles.map((automovil) => (
                    <tr key={automovil.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {automovil.movil}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {automovil.placa}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          automovil.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {automovil.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          automovil.disponible 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {automovil.disponible ? 'Disponible' : 'No disponible'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {automovil.automovilPropietario && automovil.automovilPropietario.length > 0 ? (
                            automovil.automovilPropietario.map((ap) => (
                              <span
                                key={ap.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full"
                              >
                                <UserCheck size={12} />
                                {ap.propietario.nombre}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">Sin propietarios</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {automovil.conductorAutomovil.length > 0 ? (
                            automovil.conductorAutomovil.map((ca) => (
                              <span
                                key={ca.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                              >
                                <Car size={12} />
                                {ca.conductor.nombre}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">Sin conductores</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(automovil)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleView(automovil)}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded transition-colors cursor-pointer"
                            title="Ver"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteId(automovil.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {automoviles.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-gray-400">
                            <Car size={48} />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">
                              No hay automóviles registrados
                            </h3>
                            <p className="text-gray-500 mb-4">
                              Comienza agregando el primer automóvil al sistema
                            </p>
                            <button
                              onClick={openNewModal}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer mx-auto"
                            >
                              <Plus size={16} />
                              Agregar Primer Automóvil
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
            className="fixed inset-0 bg-gray-400/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={handleModalClose}
          >
            <div 
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editId ? 'Editar Automóvil' : 'Nuevo Automóvil'}
                </h2>
                <button
                  onClick={handleModalClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  {/* X size={24} /> */}
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto">
                {/* Información básica */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Información Básica</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Móvil
                      </label>
                      <input
                        type="text"
                        required
                        value={form.movil}
                        onChange={(e) => setForm({ ...form, movil: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Número de móvil"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Placa
                      </label>
                      <input
                        type="text"
                        required
                        value={form.placa}
                        onChange={(e) => setForm({ ...form, placa: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Placa del vehículo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Propietarios
                      </label>
                      <input
                        type="text"
                        value={propietarioFilter}
                        onChange={(e) => setPropietarioFilter(e.target.value)}
                        placeholder="Buscar propietario por nombre o cédula..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      />
                      <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2 bg-gray-50">
                        {filteredPropietarios.length > 0 ? (
                          filteredPropietarios.map((p) => (
                            <label key={p.id} className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.propietarios.includes(p.id)}
                                onChange={() => handlePropietarioToggle(p.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="ml-2 text-sm text-gray-700">{p.nombre} ({p.cedula})</span>
                            </label>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500">No hay resultados</div>
                        )}
                      </div>
                      {form.propietarios.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {form.propietarios.map((id) => {
                            const p = propietarios.find((x) => x.id === id)
                            if (!p) return null
                            return (
                              <span key={id} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                <UserCheck size={12} />
                                {p.nombre}
                                <button type="button" onClick={() => handlePropietarioToggle(id)} className="ml-1 text-purple-700 hover:text-purple-900">×</button>
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.activo}
                            onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">
                            Automóvil activo
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.disponible}
                            onChange={(e) => setForm({ ...form, disponible: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">
                            Automóvil disponible
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Documentos y fechas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Documentos y Fechas de Vencimiento</h3>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">SOAT</label>
                        <input
                          type="date"
                          value={form.soat || ''}
                          onChange={(e) => setForm({ ...form, soat: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Revisión Tecnomecánica</label>
                        <input
                          type="date"
                          value={form.revisionTecnomecanica || ''}
                          onChange={(e) => setForm({ ...form, revisionTecnomecanica: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tarjeta de Operación</label>
                        <input
                          type="date"
                          value={form.tarjetaOperacion || ''}
                          onChange={(e) => setForm({ ...form, tarjetaOperacion: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Licencia de Tránsito</label>
                        <input
                          type="date"
                          value={form.licenciaTransito || ''}
                          onChange={(e) => setForm({ ...form, licenciaTransito: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Extintor</label>
                        <input
                          type="date"
                          value={form.extintor || ''}
                          onChange={(e) => setForm({ ...form, extintor: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Revisión Preventiva</label>
                        <input
                          type="date"
                          value={form.revisionPreventiva || ''}
                          onChange={(e) => setForm({ ...form, revisionPreventiva: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Revisión Anual</label>
                        <input
                          type="date"
                          value={form.revisionAnual || ''}
                          onChange={(e) => setForm({ ...form, revisionAnual: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conductores asignados */}
                <div className="border-t pt-6 mt-6">

                  <h3 className="text-lg font-medium text-gray-900 mb-4">Conductores Asignados</h3>
                  
                  {/* Filtro de búsqueda para conductores */}
                  <div className="mb-3">
                    <input
                      type="text"
                      value={conductorFilter}
                      onChange={(e) => setConductorFilter(e.target.value)}
                      placeholder="Buscar por nombre o cédula..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Lista de conductores filtrados */}
                  <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2 bg-gray-50">
                    {filteredConductores.length > 0 ? (
                      filteredConductores.map((conductor) => (
                        <label key={conductor.id} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.conductores.includes(conductor.id)}
                            onChange={() => handleConductorToggle(conductor.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {conductor.nombre} ({conductor.cedula})
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        {conductorFilter ? 'No se encontraron conductores' : 'No hay conductores disponibles'}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="sticky bottom-0 bg-white flex gap-3 pt-4 pb-2 border-t mt-6">
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
                  {/* AlertTriangle className="h-6 w-6 text-red-600" /> */}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirmar eliminación
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    ¿Estás seguro de que quieres eliminar este automóvil? Esta acción no se puede deshacer.
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
                  Detalles del Automóvil - {viewItem.movil}
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
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información General</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium text-gray-700">Móvil:</span> <span className="text-gray-900">{viewItem.movil}</span></p>
                      <p><span className="font-medium text-gray-700">Placa:</span> <span className="text-gray-900">{viewItem.placa}</span></p>
                      <p>
                        <span className="font-medium text-gray-700">Estado:</span> 
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                          viewItem.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {viewItem.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Disponibilidad:</span> 
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                          viewItem.disponible ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {viewItem.disponible ? 'Disponible' : 'No disponible'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Documentos y Fechas de Vencimiento</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium text-gray-700">SOAT:</span> <span className="text-gray-900">
                        {viewItem.soat ? (() => {
                          try {
                            return new Date(viewItem.soat).toLocaleDateString('es-ES')
                          } catch {
                            return 'Fecha inválida'
                          }
                        })() : 'No registrado'}
                      </span></p>
                      <p><span className="font-medium text-gray-700">Revisión Tecnomecánica:</span> <span className="text-gray-900">
                        {viewItem.revisionTecnomecanica ? (() => {
                          try {
                            return new Date(viewItem.revisionTecnomecanica).toLocaleDateString('es-ES')
                          } catch {
                            return 'Fecha inválida'
                          }
                        })() : 'No registrada'}
                      </span></p>
                      <p><span className="font-medium text-gray-700">Tarjeta de Operación:</span> <span className="text-gray-900">
                        {viewItem.tarjetaOperacion ? (() => {
                          try {
                            return new Date(viewItem.tarjetaOperacion).toLocaleDateString('es-ES')
                          } catch {
                            return 'Fecha inválida'
                          }
                        })() : 'No registrada'}
                      </span></p>
                      <p><span className="font-medium text-gray-700">Licencia de Tránsito:</span> <span className="text-gray-900">
                        {viewItem.licenciaTransito ? (() => {
                          try {
                            return new Date(viewItem.licenciaTransito).toLocaleDateString('es-ES')
                          } catch {
                            return 'Fecha inválida'
                          }
                        })() : 'No registrada'}
                      </span></p>
                      <p><span className="font-medium text-gray-700">Extintor:</span> <span className="text-gray-900">
                        {viewItem.extintor ? (() => {
                          try {
                            return new Date(viewItem.extintor).toLocaleDateString('es-ES')
                          } catch {
                            return 'Fecha inválida'
                          }
                        })() : 'No registrado'}
                      </span></p>
                      <p><span className="font-medium text-gray-700">Revisión Preventiva:</span> <span className="text-gray-900">
                        {viewItem.revisionPreventiva ? (() => {
                          try {
                            return new Date(viewItem.revisionPreventiva).toLocaleDateString('es-ES')
                          } catch {
                            return 'Fecha inválida'
                          }
                        })() : 'No registrada'}
                      </span></p>
                      <p><span className="font-medium text-gray-700">Revisión Anual:</span> <span className="text-gray-900">
                        {viewItem.revisionAnual ? (() => {
                          try {
                            return new Date(viewItem.revisionAnual).toLocaleDateString('es-ES')
                          } catch {
                            return 'Fecha inválida'
                          }
                        })() : 'No registrada'}
                      </span></p>
                    </div>
                  </div>
                </div>

                {/* Propietarios */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Propietarios Asignados</h3>
                  {viewItem.automovilPropietario && viewItem.automovilPropietario.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {viewItem.automovilPropietario.map((ap) => (
                        <span key={ap.id} className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full">
                          <UserCheck size={14} />
                          {ap.propietario.nombre} ({ap.propietario.cedula})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No hay propietarios asignados</p>
                  )}
                </div>

                {/* Conductores */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Conductores Asignados</h3>
                  {viewItem.conductorAutomovil.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {viewItem.conductorAutomovil.map((ca) => (
                        <span
                          key={ca.id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          <UserCheck size={14} />
                          {ca.conductor.nombre} ({ca.conductor.cedula})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No hay conductores asignados</p>
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