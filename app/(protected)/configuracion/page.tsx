'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Switch } from '@/src/components/ui/Switch';
import { Input } from '@/src/components/ui/Input';
import { Label } from '@/src/components/ui/Label';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { useNotifications } from '@/src/lib/notifications';
import RouteGuard from '@/src/components/RouteGuard';

interface Configuracion {
  id: number;
  tiempoMinimoSalida: number;
  activo: boolean;
  // Configuración de impresora
  impresoraHabilitada: boolean;
  impresionDirecta: boolean;
}

export default function ConfiguracionPage() {
  const notifications = useNotifications();
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/configuracion');
      if (response.ok) {
        const data = await response.json();
        setConfiguracion(data);
      } else {
        notifications.error('Error al cargar la configuración');
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      notifications.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguracion = async () => {
    if (!configuracion) return;

    try {
      setSaving(true);
      const response = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configuracion),
      });

      if (response.ok) {
        notifications.success('Configuración guardada exitosamente');
      } else {
        const errorData = await response.json();
        notifications.error(errorData.error || 'Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      notifications.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof Configuracion, value: boolean | number | string) => {
    if (!configuracion) return;
    setConfiguracion({
      ...configuracion,
      [field]: value,
    });
  };

  if (loading) {
    return (
      <RouteGuard requiredPermission="tablaTurno">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando configuración...</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

      return (
      <RouteGuard requiredPermission="tablaTurno">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
                <p className="text-gray-600 mt-1">Administra los parámetros del sistema de gestión de turnos</p>
              </div>
            </div>
          </div>

          {/* Configuración del Sistema */}
          {configuracion && (
            <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <Settings className="h-6 w-6" />
                  Configuración del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">


                {/* Tiempo Mínimo de Salida */}
                <div className="space-y-3">
                  <Label htmlFor="tiempoMinimoSalida" className="text-base font-medium text-gray-900">
                    Tiempo Mínimo de Salida (minutos)
                  </Label>
                  <p className="text-sm text-gray-600">
                    Tiempo mínimo que debe transcurrir desde la hora actual hasta la salida del turno. Este valor se usa para evitar asignar turnos muy próximos al tiempo actual.
                  </p>
                  <Input
                    id="tiempoMinimoSalida"
                    type="number"
                    min="1"
                    max="60"
                    value={configuracion.tiempoMinimoSalida}
                    onChange={(e) => handleInputChange('tiempoMinimoSalida', parseInt(e.target.value))}
                    className="max-w-xs"
                  />
                </div>

                {/* Configuración de Impresora */}
                <div className="space-y-6 border-t border-gray-200 pt-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Impresora</h3>
                  </div>
                  
                  {/* Habilitar Impresora */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium text-gray-900">
                        Habilitar Impresión de Recibos
                      </Label>
                      <p className="text-sm text-gray-600">
                        Activa la funcionalidad de impresión de recibos después de asignar un turno
                      </p>
                    </div>
                    <Switch
                      checked={configuracion.impresoraHabilitada}
                      onCheckedChange={(checked) => handleInputChange('impresoraHabilitada', checked)}
                    />
                  </div>

                  {/* Impresión Directa */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium text-gray-900">
                        Impresión Directa
                      </Label>
                      <p className="text-sm text-gray-600">
                        Intenta imprimir automáticamente usando la impresora predeterminada (el navegador puede mostrar el diálogo por seguridad)
                      </p>
                    </div>
                    <Switch
                      checked={configuracion.impresionDirecta}
                      onCheckedChange={(checked) => handleInputChange('impresionDirecta', checked)}
                      disabled={!configuracion.impresoraHabilitada}
                    />
                  </div>


                </div>





                {/* Botones de acción */}
                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <Button 
                    onClick={guardarConfiguracion} 
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={cargarConfiguracion}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Recargar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estado sin configuración */}
          {!configuracion && (
            <Card className="bg-white rounded-lg shadow-sm border border-gray-200 text-center py-12">
              <CardContent>
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay configuración disponible</h3>
                <p className="text-gray-600 mb-4">
                  La configuración del sistema no está disponible. Contacta al administrador.
                </p>
                <Button 
                  onClick={cargarConfiguracion}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer mx-auto"
                >
                  <RefreshCw className="h-4 w-4" />
                  Intentar Cargar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </RouteGuard>
  );
} 