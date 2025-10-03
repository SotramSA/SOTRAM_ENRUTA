'use client';

import { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { Card } from './Card';
import { TimeService } from '@/src/lib/timeService';

export function TimeController() {
  const [simulatedTime, setSimulatedTime] = useState<string>('');
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Función para obtener la hora del servidor respetando la simulación
  const fetchCurrentTime = async () => {
    try {
      
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
      
      const response = await fetch('/api/time', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...TimeService.getSimulationHeaders(),
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      
      
      if (response.ok) {
        const data = await response.json();
        setCurrentTime(new Date(data.currentTime));
        setIsSimulationMode(data.isSimulationMode);
      } else {
        console.error('🔍 TimeController: Response no ok:', response.status, response.statusText);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('🔍 TimeController: Request timeout');
      } else {
        console.error('🔍 TimeController: Error obteniendo hora actual:', error);
        console.error('🔍 TimeController: Error stack:', error instanceof Error ? error.stack : 'No stack available');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar la hora actual cada segundo
  useEffect(() => {
    fetchCurrentTime(); // Llamada inicial
    const interval = setInterval(fetchCurrentTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Handlers que modifican localStorage sin recargar la página ---

  const handleSetSimulatedTime = () => {
    if (simulatedTime) {
      const [hours, minutes] = simulatedTime.split(':').map(Number);
      TimeService.setSpecificTime(hours, minutes);
      setSimulatedTime(''); // Limpiar el input
      // Actualizar inmediatamente sin recargar
      fetchCurrentTime();
    }
  };

  const handleResetToRealTime = () => {
    TimeService.resetToRealTime();
    // Actualizar inmediatamente sin recargar
    fetchCurrentTime();
  };

  const handleAdvanceTime = (minutes: number) => {
    TimeService.advanceTime(minutes);
    // Actualizar inmediatamente sin recargar
    fetchCurrentTime();
  };

  const handleRewindTime = (minutes: number) => {
    TimeService.rewindTime(minutes);
    // Actualizar inmediatamente sin recargar
    fetchCurrentTime();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <Card className="p-6 bg-white border-gray-200 shadow-sm" hidden>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">🕐 Control de Hora del Sistema</h3>
          <Button
            onClick={handleResetToRealTime}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isSimulationMode 
                ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' 
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            {isSimulationMode ? 'MODO SIMULACIÓN' : 'HORA REAL'}
          </Button>
        </div>

        {/* Hora actual */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <Label className="text-sm font-medium text-gray-600">Hora Actual del Sistema</Label>
          <div className="text-2xl font-bold text-gray-900">
            {isLoading ? (
              <span className="text-gray-400">Cargando...</span>
            ) : currentTime ? (
              formatTime(currentTime)
            ) : (
              <span className="text-gray-400">Error al cargar</span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {isLoading ? (
              <span className="text-gray-400">Cargando...</span>
            ) : currentTime ? (
              formatDate(currentTime)
            ) : (
              <span className="text-gray-400">Error al cargar</span>
            )}
          </div>
        </div>

        {/* Controles de simulación */}
        <div className="space-y-3">
          <Label htmlFor="simulatedTime">Establecer Hora Simulada</Label>
          <div className="flex gap-2">
            <Input
              id="simulatedTime"
              type="time"
              value={simulatedTime}
              onChange={(e) => setSimulatedTime(e.target.value)}
              placeholder="HH:MM"
              className="flex-1 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <Button 
              onClick={handleSetSimulatedTime}
              disabled={!simulatedTime}
              className="px-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Establecer
            </Button>
          </div>
        </div>

        {/* Controles de avance/retroceso */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-sm">Avanzar Tiempo</Label>
            <div className="flex gap-1">
              <Button 
                onClick={() => handleAdvanceTime(5)}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                +5 min
              </Button>
              <Button 
                onClick={() => handleAdvanceTime(15)}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                +15 min
              </Button>
              <Button 
                onClick={() => handleAdvanceTime(30)}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                +30 min
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Retroceder Tiempo</Label>
            <div className="flex gap-1">
              <Button 
                onClick={() => handleRewindTime(5)}
                size="sm"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                variant="outline"
              >
                -5 min
              </Button>
              <Button 
                onClick={() => handleRewindTime(15)}
                size="sm"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                variant="outline"
              >
                -15 min
              </Button>
              <Button 
                onClick={() => handleRewindTime(30)}
                size="sm"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                variant="outline"
              >
                -30 min
              </Button>
            </div>
          </div>
        </div>

        {/* Botón de reset */}
        {isSimulationMode && (
          <Button 
            onClick={handleResetToRealTime}
            variant="outline"
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            🔄 Volver a Hora Real
          </Button>
        )}

        {/* Información adicional */}
        <div className="text-xs text-gray-600 space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <p className="flex items-start gap-2">
            <span className="text-orange-500">💡</span>
            <span><strong>Modo Simulación:</strong> Permite probar el sistema con diferentes horas</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-red-500">⚠️</span>
            <span><strong>Importante:</strong> Todos los cálculos de enrutamiento usarán esta hora</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-blue-500">🔄</span>
            <span><strong>Actualización:</strong> La hora se actualiza automáticamente cada segundo</span>
          </p>
        </div>
      </div>
    </Card>
  );
}