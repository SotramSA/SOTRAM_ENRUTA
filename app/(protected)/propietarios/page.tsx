'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/src/components/ui/Button'
import { UserCheck, Plus, Edit, Trash2, Search, Filter, Bus } from 'lucide-react'
import RouteGuard from '@/src/components/RouteGuard'
import { useNotifications, createApiNotifications } from '@/src/lib/notifications'

interface Propietario {
  id: number
  nombre: string
  cedula: string
  telefono?: string
  correo?: string
  observaciones?: string
  estado: boolean
  automoviles?: Automovil[]
}

//

interface Automovil {
  id: number
  movil: string
  placa: string
  activo: boolean
}

export default function PropietariosPage() {
  const notifications = useNotifications()
  const apiNotify = createApiNotifications(notifications)
  const [propietarios, setPropietarios] = useState<Propietario[]>([])
  const [filteredPropietarios, setFilteredPropietarios] = useState<Propietario[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPropietario, setEditingPropietario] = useState<Propietario | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [automoviles, setAutomoviles] = useState<Automovil[]>([])
  const [automovilFilter, setAutomovilFilter] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    correo: '',
    observaciones: '',
    estado: true,
    automoviles: [] as number[]
  })

  useEffect(() => {
    fetchPropietarios()
    fetchAutomoviles()
  }, [])

  useEffect(() => {
    filterPropietarios()
  }, [propietarios, searchTerm, statusFilter])

  const fetchPropietarios = async () => {
    try {
      const response = await fetch('/api/propietarios')
      if (response.ok) {
        const data = await response.json()
        setPropietarios(data)
      } else {
        apiNotify.fetchError('propietarios')
      }
    } catch (error) {
      console.error('Error fetching propietarios:', error)
      apiNotify.fetchError('propietarios')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAutomoviles = async () => {
    try {
      const response = await fetch('/api/automoviles?limit=1000&activo=true')
      if (response.ok) {
        const data = await response.json()
        setAutomoviles(data.automoviles || [])
      }
    } catch (error) {
      console.error('Error al cargar automóviles:', error)
      setAutomoviles([])
    }
  }

  const filterPropietarios = () => {
    let filtered = propietarios

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(propietario =>
        propietario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        propietario.cedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
        propietario.correo?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(propietario =>
        statusFilter === 'active' ? propietario.estado : !propietario.estado
      )
    }

    setFilteredPropietarios(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingPropietario 
        ? `/api/propietarios/${editingPropietario.id}`
        : '/api/propietarios'
      
      const method = editingPropietario ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        closeModal()
        fetchPropietarios()
        if (editingPropietario) {
          apiNotify.updateSuccess('Propietario')
        } else {
          apiNotify.createSuccess('Propietario')
        }
      } else {
        const error = await response.json()
        notifications.error('Error al guardar Propietario', error.error)
      }
    } catch (error) {
      console.error('Error saving propietario:', error)
      apiNotify.createError('Propietario')
    }
  }

  const handleEdit = (propietario: Propietario) => {
    setEditingPropietario(propietario)
    setFormData({
      nombre: propietario.nombre,
      cedula: propietario.cedula,
      telefono: propietario.telefono || '',
      correo: propietario.correo || '',
      observaciones: propietario.observaciones || '',
      estado: propietario.estado,
      automoviles: propietario.automoviles?.map(auto => auto.id) || []
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/propietarios/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchPropietarios()
        apiNotify.deleteSuccess('Propietario')
      } else {
        const error = await response.json()
        notifications.error('Error al eliminar Propietario', error.error)
      }
    } catch (error) {
      console.error('Error deleting propietario:', error)
      apiNotify.deleteError('Propietario')
    } finally {
      setDeleteId(null)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      cedula: '',
      telefono: '',
      correo: '',
      observaciones: '',
      estado: true,
      automoviles: []
    })
  }

  const openModal = () => {
    setEditingPropietario(null)
    resetForm()
    setAutomovilFilter('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPropietario(null)
    resetForm()
    setAutomovilFilter('')
  }

  const handleAutomovilToggle = (automovilId: number) => {
    setFormData(prev => ({
      ...prev,
      automoviles: prev.automoviles.includes(automovilId)
        ? prev.automoviles.filter(id => id !== automovilId)
        : [...prev.automoviles, automovilId]
    }))
  }

  // Filtrar automóviles basado en el texto de búsqueda
  const filteredAutomoviles = automoviles.filter(auto => 
    auto.activo && 
    (auto.movil.toLowerCase().includes(automovilFilter.toLowerCase()) ||
     auto.placa.toLowerCase().includes(automovilFilter.toLowerCase()))
  )

  if (isLoading) {
    return (
      <RouteGuard requiredPermission="tablaPropietarios">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requiredPermission="tablaPropietarios">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Propietarios</h1>
                <p className="text-gray-600 mt-1">Administra los propietarios de los vehículos del sistema</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <UserCheck className="w-5 h-5" />
                <span>Propietarios del Sistema</span>
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                {/* Búsqueda */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar propietarios..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filtro de estado */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>
              </div>

              {/* Botón agregar */}
              <Button onClick={openModal} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Propietario
              </Button>
            </div>
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
                  {filteredPropietarios.map((propietario) => (
                    <tr key={propietario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{propietario.nombre}</div>
                          <div className="text-sm text-gray-500">C.C. {propietario.cedula}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{propietario.correo || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{propietario.telefono || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {propietario.automoviles && propietario.automoviles.length > 0 ? (
                            propietario.automoviles.map((auto) => (
                              <span
                                key={auto.id}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                              >
                                <Bus size={12} />
                                {auto.movil}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">Sin automóviles</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          propietario.estado
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {propietario.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEdit(propietario)}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                                                     <Button
                             onClick={() => setDeleteId(propietario.id)}
                             variant="outline"
                             size="sm"
                             className="text-red-600 hover:text-red-900"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPropietarios.length === 0 && (
              <div className="text-center py-12">
                <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay propietarios</h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No se encontraron propietarios con los filtros aplicados.'
                    : 'Comienza agregando el primer propietario al sistema.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

                 {/* Modal */}
         {isModalOpen && (
           <div 
             className="fixed inset-0 bg-gray-400/50 flex items-center justify-center z-50 p-4"
             onClick={closeModal}
           >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingPropietario ? 'Editar Propietario' : 'Nuevo Propietario'}
                </h2>
                                 <button
                   onClick={closeModal}
                   className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                 >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Primera fila - 2 columnas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre completo"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cédula *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
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
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Número de teléfono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correo
                    </label>
                    <input
                      type="email"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Correo electrónico"
                    />
                  </div>
                </div>

                {/* Observaciones - ancho completo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
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
                      checked={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Propietario activo
                    </span>
                  </label>
                </div>

                {/* Automóviles asignados */}
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
                            checked={formData.automoviles.includes(automovil.id)}
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
                     onClick={closeModal}
                     className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                   >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    {editingPropietario ? 'Actualizar' : 'Crear'}
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
                   <Trash2 className="h-6 w-6 text-red-600" />
                 </div>
                 <div>
                   <h3 className="text-lg font-medium text-gray-900">
                     Confirmar eliminación
                   </h3>
                   <p className="text-sm text-gray-500 mt-1">
                     ¿Estás seguro de que quieres eliminar este propietario? Esta acción no se puede deshacer.
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
                   className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                 >
                   Eliminar
                 </button>
               </div>
             </div>
           </div>
         )}
       </div>
     </RouteGuard>
   )
 }
