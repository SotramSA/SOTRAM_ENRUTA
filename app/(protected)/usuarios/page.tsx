'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit, X, AlertTriangle, Search, ChevronLeft, ChevronRight, User, Shield, UserCog } from 'lucide-react'
import axios from 'axios'
import { useNotifications, createApiNotifications } from '@/src/lib/notifications'
import RouteGuard from '@/src/components/RouteGuard'

interface Usuario {
  id: number
  nombre: string
  usuario: string
  activo: boolean
  tablaConductor: boolean
  tablaAutomovil: boolean
  tablaUsuario: boolean
  tablaRuta: boolean
  tablaConductorAutomovil: boolean
  tablaTurno: boolean
  tablaPlanilla: boolean
  tablaSancionConductor: boolean
  tablaSancionAutomovil: boolean
  tablaFecha: boolean
  tablaInformes: boolean
  tablaPropietarios: boolean
  tablaProgramada: boolean
}

interface FormData {
  nombre: string
  usuario: string
  password: string
  confirmPassword: string
  activo: boolean
  tablaConductor: boolean
  tablaAutomovil: boolean
  tablaUsuario: boolean
  tablaRuta: boolean
  tablaConductorAutomovil: boolean
  tablaTurno: boolean
  tablaPlanilla: boolean
  tablaSancionConductor: boolean
  tablaSancionAutomovil: boolean
  tablaFecha: boolean
  tablaInformes: boolean
  tablaPropietarios: boolean
  tablaProgramada: boolean
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

const permisos = [
  { label: 'Automóviles', name: 'tablaAutomovil' },
  { label: 'Conductores', name: 'tablaConductor' },
  { label: 'Conductor-Automóvil', name: 'tablaConductorAutomovil' },
  { label: 'Fechas', name: 'tablaFecha' },
  { label: 'Informes', name: 'tablaInformes' },
  { label: 'Planillas', name: 'tablaPlanilla' },
  { label: 'Programado', name: 'tablaProgramada' },
  { label: 'Propietarios', name: 'tablaPropietarios' },
  { label: 'Rutas', name: 'tablaRuta' },
  { label: 'Sanción Automóvil', name: 'tablaSancionAutomovil' },
  { label: 'Sanción Conductor', name: 'tablaSancionConductor' },
  { label: 'Turnos', name: 'tablaTurno' },
  { label: 'Usuarios', name: 'tablaUsuario' }
]

export default function UsuarioManager() {
  const notifications = useNotifications()
  const apiNotifications = createApiNotifications(notifications)
  
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [form, setForm] = useState<FormData>({
    nombre: '',
    usuario: '',
    password: '',
    confirmPassword: '',
    activo: true,
    tablaConductor: false,
    tablaAutomovil: false,
    tablaUsuario: false,
    tablaRuta: false,
    tablaConductorAutomovil: false,
    tablaTurno: false,
    tablaPlanilla: false,
    tablaSancionConductor: false,
    tablaSancionAutomovil: false,
    tablaFecha: false,
    tablaInformes: false,
    tablaPropietarios: false,
    tablaProgramada: false
  })
  const [editId, setEditId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchUsuarios()
  }, [pagination.page, searchTerm])

  async function fetchUsuarios() {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: searchTerm
      })
      
      const res = await axios.get(`/api/usuarios?${params}`)
      setUsuarios(res.data.usuarios)
      setPagination(prev => ({
        ...prev,
        total: res.data.total,
        totalPages: res.data.totalPages
      }))
    } catch (error) {
      apiNotifications.fetchError('usuarios')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    
    // Validar que las contraseñas coincidan
    if (!editId && form.password !== form.confirmPassword) {
      notifications.error('Las contraseñas no coinciden')
      return
    }
    
    // Validar que la contraseña tenga al menos 6 caracteres
    if (!editId && form.password.length < 6) {
      notifications.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    // Si es edición y se proporcionó una nueva contraseña, validar
    if (editId && form.password && form.password !== form.confirmPassword) {
      notifications.error('Las contraseñas no coinciden')
      return
    }
    
    if (editId && form.password && form.password.length < 6) {
      notifications.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    setIsLoading(true)
    
    try {
      // Crear objeto sin confirmPassword para enviar al servidor
      const { confirmPassword, ...formData } = form
      
      if (editId) {
        await axios.put(`/api/usuarios/${editId}`, formData)
        apiNotifications.updateSuccess('Usuario')
      } else {
        await axios.post('/api/usuarios', formData)
        apiNotifications.createSuccess('Usuario')
      }
      
      resetForm()
      setEditId(null)
      setIsModalOpen(false)
      fetchUsuarios()
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al guardar usuario'
      if (editId) {
        apiNotifications.updateError('usuario')
      } else {
        apiNotifications.createError('usuario')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: number) {
    setIsLoading(true)
    try {
      await axios.delete(`/api/usuarios/${id}`)
      apiNotifications.deleteSuccess('Usuario')
      fetchUsuarios()
    } catch (error) {
      apiNotifications.deleteError('usuario')
    } finally {
      setIsLoading(false)
      setDeleteId(null)
    }
  }

  function handleEdit(usuario: Usuario) {
    setForm({
      nombre: usuario.nombre,
      usuario: usuario.usuario,
      password: '', // No mostrar contraseña actual
      confirmPassword: '', // No mostrar contraseña actual
      activo: usuario.activo,
      tablaConductor: usuario.tablaConductor,
      tablaAutomovil: usuario.tablaAutomovil,
      tablaUsuario: usuario.tablaUsuario,
      tablaRuta: usuario.tablaRuta,
      tablaConductorAutomovil: usuario.tablaConductorAutomovil,
      tablaTurno: usuario.tablaTurno,
      tablaPlanilla: usuario.tablaPlanilla,
      tablaSancionConductor: usuario.tablaSancionConductor,
      tablaSancionAutomovil: usuario.tablaSancionAutomovil,
      tablaFecha: usuario.tablaFecha,
      tablaInformes: usuario.tablaInformes,
      tablaPropietarios: usuario.tablaPropietarios,
      tablaProgramada: usuario.tablaProgramada
    })
    setEditId(usuario.id)
    setIsModalOpen(true)
  }

  function openNewModal() {
    resetForm()
    setEditId(null)
    setIsModalOpen(true)
  }

  function resetForm() {
    setForm({
      nombre: '',
      usuario: '',
      password: '',
      confirmPassword: '',
      activo: true,
      tablaConductor: false,
      tablaAutomovil: false,
      tablaUsuario: false,
      tablaRuta: false,
      tablaConductorAutomovil: false,
      tablaTurno: false,
      tablaPlanilla: false,
      tablaSancionConductor: false,
      tablaSancionAutomovil: false,
      tablaFecha: false,
      tablaInformes: false,
      tablaPropietarios: false,
      tablaProgramada: false
    })
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
    resetForm()
    setEditId(null)
  }

  function handlePermisoToggle(permisoName: keyof FormData) {
    setForm(prev => ({
      ...prev,
      [permisoName]: !prev[permisoName]
    }))
  }

  function getPermisosActivos(usuario: Usuario) {
    return permisos.filter(permiso => usuario[permiso.name as keyof Usuario])
  }

  function getPasswordValidationClass() {
    if (!form.password && !form.confirmPassword) return ''
    if (form.password === form.confirmPassword) return 'border-green-500 focus:border-green-500'
    return 'border-red-500 focus:border-red-500'
  }

  function getPasswordMatchText() {
    if (!form.password && !form.confirmPassword) return ''
    if (form.password === form.confirmPassword) {
      return <span className="text-green-600 text-xs">✓ Las contraseñas coinciden</span>
    }
    return <span className="text-red-600 text-xs">✗ Las contraseñas no coinciden</span>
  }

  return (
    <RouteGuard requiredPermission="tablaUsuario">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                <p className="text-gray-600 mt-1">Administra los usuarios del sistema</p>
              </div>
              <button
                onClick={openNewModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus size={20} />
                Nuevo Usuario
              </button>
            </div>
          </div>

          {/* Buscador */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o usuario..."
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
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permisos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {usuario.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usuario.usuario}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          usuario.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {getPermisosActivos(usuario).length > 0 ? (
                            getPermisosActivos(usuario).map((permiso) => (
                              <span
                                key={permiso.name}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                              >
                                <Shield size={12} />
                                {permiso.label}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">Sin permisos</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteId(usuario.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No hay usuarios registrados
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
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editId ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <button
                  onClick={handleModalClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Columna izquierda - Información básica */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Información básica</h3>
                    
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
                        Usuario
                      </label>
                      <input
                        type="text"
                        required
                        value={form.usuario}
                        onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre de usuario"
                      />
                    </div>

                                       <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Contraseña {editId && <span className="text-gray-500 text-xs">(dejar vacío para mantener la actual)</span>}
                       </label>
                       <input
                         type="password"
                         required={!editId}
                         value={form.password}
                         onChange={(e) => setForm({ ...form, password: e.target.value })}
                         className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getPasswordValidationClass()}`}
                         placeholder={editId ? "•••••••• (opcional)" : "••••••••"}
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Confirmar Contraseña {editId && <span className="text-gray-500 text-xs">(solo si cambias la contraseña)</span>}
                       </label>
                       <input
                         type="password"
                         required={!editId}
                         value={form.confirmPassword}
                         onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                         className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getPasswordValidationClass()}`}
                         placeholder={editId ? "•••••••• (opcional)" : "••••••••"}
                       />
                       {getPasswordMatchText()}
                     </div>

                    <div>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.activo}
                          onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          Usuario activo
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Columna derecha - Permisos */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Permisos de acceso</h3>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {permisos.map((permiso) => (
                        <label key={permiso.name} className="flex items-center justify-between border px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                          <span className="text-gray-700 text-sm font-medium">{permiso.label}</span>
                          <input
                            type="checkbox"
                            checked={form[permiso.name as keyof FormData] as boolean}
                            onChange={() => handlePermisoToggle(permiso.name as keyof FormData)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
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
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirmar eliminación
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    ¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.
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
      </div>
    </RouteGuard>
  )
}