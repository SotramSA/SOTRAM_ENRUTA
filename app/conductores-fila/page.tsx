'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FilaItem {
  id: number;
  numeroMovil: string;
  nombreConductor: string;
  fechaCreacion: string;
  posicion?: number;
}

export default function ConductoresFilaPage() {
  const [numeroMovil, setNumeroMovil] = useState('');
  const [nombreConductor, setNombreConductor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [ipInfo, setIpInfo] = useState<string>('');

  // Cargar fila actual
  const cargarFila = async () => {
    try {
      const response = await fetch('/api/fila-espera');
      if (response.ok) {
        const data = await response.json();
        const filaConPosicion = data.map((item: FilaItem, index: number) => ({
          ...item,
          posicion: index + 1
        }));
        setFila(filaConPosicion);
      }
    } catch (error) {
      console.error('Error al cargar fila:', error);
    }
  };

  useEffect(() => {
    cargarFila();
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarFila, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);

    try {
      const response = await fetch('/api/fila-espera', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numeroMovil: numeroMovil.trim(),
          nombreConductor: nombreConductor.trim(),
          observaciones: observaciones.trim() || null
        }),
      });

      const data = await response.json();

      if (response.ok) {
         setMensaje({ tipo: 'success', texto: '¡Te has agregado a la fila exitosamente!' });
         setNumeroMovil('');
         setNombreConductor('');
         setObservaciones('');
         cargarFila(); // Recargar la fila
       } else {
         setMensaje({ tipo: 'error', texto: data.error || 'Error al agregar a la fila' });
         if (data.ip) {
           setIpInfo(`Tu IP: ${data.ip}`);
         }
       }
     } catch (error) {
       setMensaje({ tipo: 'error', texto: 'Error de conexión. Intenta nuevamente.' });
     } finally {
       setCargando(false);
    }
  };

  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚐 Fila de Espera - Conductores
          </h1>
          <p className="text-gray-600">
            Ingresa tus datos para agregarte a la fila de despacho
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Formulario de ingreso */}
          <Card>
            <CardHeader>
              <CardTitle>Ingresar a la Fila</CardTitle>
              <CardDescription>
                Completa los datos para agregarte a la cola de despacho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="numeroMovil" className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Móvil *
                  </label>
                  <Input
                    id="numeroMovil"
                    type="text"
                    value={numeroMovil}
                    onChange={(e) => setNumeroMovil(e.target.value)}
                    placeholder="Ej: 001, 002, 003..."
                    required
                    maxLength={10}
                  />
                </div>

                <div>
                  <label htmlFor="nombreConductor" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Conductor *
                  </label>
                  <Input
                    id="nombreConductor"
                    type="text"
                    value={nombreConductor}
                    onChange={(e) => setNombreConductor(e.target.value)}
                    placeholder="Nombre completo"
                    required
                    maxLength={100}
                  />
                </div>

                <div>
                  <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones (Opcional)
                  </label>
                  <Input
                    id="observaciones"
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Información adicional..."
                    maxLength={200}
                  />
                </div>

                {mensaje && (
                  <Alert className={mensaje.tipo === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                    <AlertDescription className={mensaje.tipo === 'error' ? 'text-red-700' : 'text-green-700'}>
                      {mensaje.texto}
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  disabled={cargando}
                  className="w-full"
                >
                  {cargando ? 'Agregando...' : 'Agregar a la Fila'}
                </Button>
              </form>

              {/* Información adicional */}
              <div className="mt-2 text-xs text-gray-500">
                <p>* Solo se puede acceder desde el computador autorizado</p>
                <p>* Los campos marcados con * son obligatorios</p>
              </div>
            </CardContent>
          </Card>

          {/* Vista de la fila actual */}
          <Card>
            <CardHeader>
              <CardTitle>Fila Actual ({fila.length} en espera)</CardTitle>
              <CardDescription>
                Estado actual de la cola de despacho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {fila.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No hay conductores en la fila
                  </div>
                ) : (
                  fila.map((item, index) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            Móvil {item.numeroMovil}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.nombreConductor}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatearHora(item.fechaCreacion)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-xs text-gray-500">
                  Actualización automática cada 30 segundos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información del sistema */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-gray-600">
              <p className="mb-2">
                📋 <strong>Sistema de Fila Digital SOTRAM</strong>
              </p>
              <ul className="text-left max-w-2xl mx-auto space-y-1">
                <li>• Los conductores se despachan en orden de llegada</li>
                <li>• El administrador puede ver y gestionar la fila en tiempo real</li>
                <li>• Se notifica automáticamente cuando eres despachado</li>
                <li>• Mantén tu móvil listo para el despacho</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}