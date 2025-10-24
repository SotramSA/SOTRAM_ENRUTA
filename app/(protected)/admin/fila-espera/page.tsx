'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FilaItem {
  id: number;
  numeroMovil: string;
  nombreConductor: string;
  fechaCreacion: string;
  observaciones?: string;
  ipOrigen?: string;
  usuarioDespacho?: {
    nombre: string;
  };
}

export default function AdminFilaEsperaPage() {
  const [filaEspera, setFilaEspera] = useState<FilaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [previousQueueLength, setPreviousQueueLength] = useState<number | null>(null);

  // Función para reproducir sonido de notificación
  const playNotificationSound = () => {
    console.log('🔊 Intentando reproducir sonido de notificación...');

    // Intentar con diferentes formatos de audio
    const audioSources = ['/notification.wav', '/notification.mp3'];

    const tryPlayAudio = (src: string) => {
      return new Promise((resolve, reject) => {
        const audio = new Audio(src);
        audio.volume = 0.7; // Volumen al 70%

        audio.addEventListener('canplaythrough', () => {
          console.log(`✅ Audio cargado correctamente: ${src}`);
          audio.play()
            .then(() => {
              console.log(`🎵 Sonido reproducido exitosamente: ${src}`);
              resolve(true);
            })
            .catch((error) => {
              console.error(`❌ Error al reproducir ${src}:`, error);
              reject(error);
            });
        });

        audio.addEventListener('error', (error) => {
          console.error(`❌ Error al cargar ${src}:`, error);
          reject(error);
        });

        // Intentar cargar el audio
        audio.load();
      });
    };

    // Intentar reproducir el primer formato disponible
    const playFirstAvailable = async () => {
      for (const src of audioSources) {
        try {
          await tryPlayAudio(src);
          return; // Si funciona, salir
        } catch (error) {
          console.log(`⚠️ Falló ${src}, intentando siguiente...`);
        }
      }

      // Si ningún formato funciona, usar beep del sistema
      console.log('🔔 Usando beep del sistema como respaldo');
      try {
        // Crear un beep usando Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        console.log('🎵 Beep del sistema reproducido');
      } catch (beepError) {
        console.error('❌ Error al crear beep del sistema:', beepError);
      }
    };

    playFirstAvailable();
  };

  // Cargar fila de espera
  const cargarFila = async () => {
    try {
      const response = await fetch('/api/fila-espera');
      if (response.ok) {
        const data = await response.json();

        // Verificar si hay nuevos conductores en la fila
        // Solo reproducir sonido si ya teníamos datos previos y la cantidad aumentó
        if (previousQueueLength !== null && data.length > previousQueueLength) {
          console.log(`🔔 Nuevo conductor detectado! Anterior: ${previousQueueLength}, Actual: ${data.length}`);
          playNotificationSound();
        }

        setPreviousQueueLength(data.length);
        setFilaEspera(data);
      } else {
        console.error('Error al cargar fila de espera');
      }
    } catch (error) {
      console.error('Error al cargar fila:', error);
    }
  };

  useEffect(() => {
    cargarFila();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(cargarFila, 10000); // Actualizar cada 10 segundos
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const despacharConductor = async (id: number, accion: 'DESPACHADO' | 'CANCELADO' = 'DESPACHADO') => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/fila-espera', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          accion,
          observaciones: accion === 'CANCELADO' ? 'Cancelado por administrador' : 'Despachado'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Conductor ${accion === 'DESPACHADO' ? 'despachado' : 'cancelado'} exitosamente`
        });
        cargarFila(); // Recargar la fila
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al procesar solicitud' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión. Intenta nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const cancelarConductor = async (id: number) => {
    await despacharConductor(id, 'CANCELADO');
  };

  const eliminarEntrada = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta entrada?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/fila-espera?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Entrada eliminada correctamente' });
        cargarFila();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Error al eliminar entrada' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión. Intenta nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearTiempoEspera = (fecha: string) => {
    const ahora = new Date();
    const fechaCreacion = new Date(fecha);
    const diferencia = ahora.getTime() - fechaCreacion.getTime();
    const minutos = Math.floor(diferencia / (1000 * 60));

    if (minutos < 60) {
      return `${minutos} min`;
    } else {
      const horas = Math.floor(minutos / 60);
      const minutosRestantes = minutos % 60;
      return `${horas}h ${minutosRestantes}m`;
    }
  };

  const calcularTiempoEspera = (fecha: string) => {
    return formatearTiempoEspera(fecha);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              🚐 Gestión de Fila de Espera
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Administra la cola de conductores esperando despacho
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <Button
              variant="outline"
              onClick={cargarFila}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              🔄 Actualizar
            </Button>

            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="w-full sm:w-auto"
            >
              {autoRefresh ? '⏸️ Pausar' : '▶️ Auto-actualizar'}
            </Button>

            <Button
              variant="outline"
              onClick={playNotificationSound}
              className="w-full sm:w-auto bg-blue-50 hover:bg-blue-100 border-blue-300"
            >
              🔊 Probar Sonido
            </Button>
          </div>
        </div>

        {message && (
          <Alert className={`${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
            <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filaEspera.length}</div>
              <div className="text-sm text-gray-600">En Fila</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filaEspera.length > 0 ? calcularTiempoEspera(filaEspera[0].fechaCreacion) : '0m'}
              </div>
              <div className="text-sm text-gray-600">Tiempo del Primero</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {autoRefresh ? '✅' : '⏸️'}
              </div>
              <div className="text-sm text-gray-600">Auto-actualización</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de conductores */}
      <Card>
        <CardHeader>
          <CardTitle>Cola de Conductores</CardTitle>
          <CardDescription>
            Conductores esperando ser despachados, ordenados por llegada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filaEspera.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🚐</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay conductores en fila</h3>
              <p className="text-gray-600">Los conductores aparecerán aquí cuando se agreguen a la fila</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filaEspera.map((conductor, index) => (
                <Card key={conductor.id} className={`border-l-4 ${index === 0 ? 'border-l-green-500 bg-green-50' :
                    index === 1 ? 'border-l-yellow-500 bg-yellow-50' :
                      'border-l-gray-300'
                  }`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                      <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${index === 0 ? 'bg-green-500' :
                            index === 1 ? 'bg-yellow-500' :
                              'bg-gray-400'
                          }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
                            <h3 className="font-semibold text-base sm:text-lg truncate">Móvil {conductor.numeroMovil}</h3>
                            {index === 0 && (
                              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full w-fit">
                                SIGUIENTE
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm sm:text-base truncate">{conductor.nombreConductor}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-500 mt-1 space-y-1 sm:space-y-0">
                            <span className="flex items-center">⏰ {formatearHora(conductor.fechaCreacion)}</span>
                            <span className="flex items-center">⏳ {calcularTiempoEspera(conductor.fechaCreacion)}</span>
                            {conductor.ipOrigen && (
                              <span className="flex items-center truncate">📍 {conductor.ipOrigen}</span>
                            )}
                          </div>
                          {conductor.observaciones && (
                            <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                              💬 {conductor.observaciones}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center md:items-stretch lg:items-center space-y-2 sm:space-y-0 md:space-y-2 lg:space-y-0 sm:space-x-2 md:space-x-0 lg:space-x-2 lg:flex-shrink-0">
                        <Button
                          onClick={() => despacharConductor(conductor.id)}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 w-full sm:w-auto md:w-full lg:w-auto"
                          size="sm"
                        >
                          ✅ Despachar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => cancelarConductor(conductor.id)}
                          disabled={loading}
                          className="border-orange-500 text-orange-600 hover:bg-orange-500 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 w-full sm:w-auto md:w-full lg:w-auto"
                          size="sm"
                        >
                          ⏸️ Cancelar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => eliminarEntrada(conductor.id)}
                          disabled={loading}
                          className="border-red-500 text-red-600 hover:bg-red-500 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 w-full sm:w-auto md:w-full lg:w-auto"
                          size="sm"
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del sistema */}
      <Card className="mt-4 sm:mt-6">
        <CardContent className="pt-4 sm:pt-6">
          <div className="text-xs sm:text-sm text-gray-600">
            <h4 className="font-semibold mb-2 text-sm sm:text-base">ℹ️ Información del Sistema:</h4>
            <ul className="space-y-1 sm:space-y-2">
              <li className="flex flex-col sm:flex-row sm:items-center">
                <span>• Los conductores se agregan desde:</span>
                <code className="bg-gray-100 px-1 rounded text-xs sm:text-sm ml-0 sm:ml-1 mt-1 sm:mt-0 inline-block">/conductores-fila</code>
              </li>
              <li>• Solo se permite acceso desde IP autorizada para agregar conductores</li>
              <li>• La fila se actualiza automáticamente cada 10 segundos</li>
              <li>• Los conductores despachados/cancelados se archivan automáticamente</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}