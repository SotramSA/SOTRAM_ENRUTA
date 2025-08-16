'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Route, Plus, Edit, Trash2, AlertTriangle, X } from 'lucide-react';
import { useNotifications } from '@/src/lib/notifications';
import RouteGuard from '@/src/components/RouteGuard';

interface Ruta {
  id: number;
  nombre: string;
  descripcion?: string;
  frecuenciaActual: number;
  prioridad: number;
  unaVezDia: boolean;
  activo: boolean;
}

interface FormData {
  nombre: string;
  descripcion: string;
  frecuenciaActual: number;
  prioridad: number;
  unaVezDia: boolean;
  activo: boolean;
}

export default function RutasPage() {
  const notifications = useNotifications();
  
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>({
    nombre: '',
    descripcion: '',
    frecuenciaActual: 6,
    prioridad: 0,
    unaVezDia: false,
    activo: true
  });

  useEffect(() => {
    cargarRutas();
  }, []);

  const cargarRutas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rutas');
      if (response.ok) {
        const data = await response.json();
        setRutas(data);
      } else {
        notifications.error('Error al cargar las rutas');
      }
    } catch (error) {
      console.error('Error al cargar rutas:', error);
      notifications.error('Error al cargar las rutas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      nombre: '',
      descripcion: '',
      frecuenciaActual: 6,
      prioridad: 0,
      unaVezDia: false,
      activo: true
    });
  };

  const handleEdit = (ruta: Ruta) => {
    setEditId(ruta.id);
    setForm({
      nombre: ruta.nombre,
      descripcion: ruta.descripcion || '',
      frecuenciaActual: ruta.frecuenciaActual,
      prioridad: ruta.prioridad,
      unaVezDia: ruta.unaVezDia,
      activo: ruta.activo
    });
    setIsModalOpen(true);
  };

  const handleNewRoute = () => {
    setEditId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editId ? `/api/rutas/${editId}` : '/api/rutas';
      const method = editId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        notifications.success(editId ? 'Ruta actualizada correctamente' : 'Ruta creada correctamente');
        setIsModalOpen(false);
        cargarRutas();
      } else {
        const errorData = await response.json();
        notifications.error(errorData.error || 'Error al procesar la ruta');
      }
    } catch (error) {
      console.error('Error al procesar ruta:', error);
      notifications.error('Error al procesar la ruta');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/rutas/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        notifications.success('Ruta eliminada correctamente');
        cargarRutas();
      } else {
        const errorData = await response.json();
        notifications.error(errorData.error || 'Error al eliminar la ruta');
      }
    } catch (error) {
      console.error('Error al eliminar ruta:', error);
      notifications.error('Error al eliminar la ruta');
    }
    setDeleteId(null);
  };

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <RouteGuard requiredPermission="tablaRuta">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando rutas...</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requiredPermission="tablaRuta">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Rutas</h1>
                <p className="text-gray-600 mt-1">Administra las rutas del sistema de transporte</p>
              </div>
              <button
                onClick={handleNewRoute}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus size={20} />
                Nueva Ruta
              </button>
            </div>
          </div>

          {/* Grid de Rutas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rutas.map((ruta) => (
              <Card key={ruta.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-gray-900">{ruta.nombre}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={ruta.activo ? "default" : "secondary"}>
                        {ruta.activo ? "Activa" : "Inactiva"}
                      </Badge>
                      {ruta.unaVezDia && (
                        <Badge variant="outline" className="text-xs">Una vez al día</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {ruta.descripcion && (
                    <p className="text-gray-600 mb-4 text-sm">{ruta.descripcion}</p>
                  )}
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Prioridad:</span>
                      <span className="font-medium text-gray-900">{ruta.prioridad}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Frecuencia actual:</span>
                      <span className="font-medium text-gray-900">{ruta.frecuenciaActual} min</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => handleEdit(ruta)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
                    >
                      <Edit size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteId(ruta.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Estado vacío */}
          {rutas.length === 0 && (
            <Card className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12">
              <CardContent>
                <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay rutas configuradas</h3>
                <p className="text-gray-600 mb-4">
                  Comienza creando la primera ruta para tu sistema de transporte.
                </p>
                <button
                  onClick={handleNewRoute}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer mx-auto"
                >
                  <Plus size={20} />
                  Crear Primera Ruta
                </button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modal de Crear/Editar Ruta */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-400/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editId ? 'Editar Ruta' : 'Nueva Ruta'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Ruta *
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Ruta A"
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción de la ruta"
                    rows={3}
                  />
                </div>



                {/* Frecuencia Actual */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frecuencia Actual (min) *
                  </label>
                  <input
                    type="number"
                    value={form.frecuenciaActual}
                    onChange={(e) => handleInputChange('frecuenciaActual', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad *
                  </label>
                  <input
                    type="number"
                    value={form.prioridad}
                    onChange={(e) => handleInputChange('prioridad', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    required
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.unaVezDia}
                      onChange={(e) => handleInputChange('unaVezDia', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Una vez al día</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => handleInputChange('activo', e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Activa</span>
                  </label>
                </div>

                {/* Botones */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {editId ? 'Actualizar' : 'Crear'} Ruta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {deleteId && (
          <div className="fixed inset-0 bg-gray-400/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-medium text-gray-900">Confirmar eliminación</h3>
              </div>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de que quieres eliminar esta ruta? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  );
} 