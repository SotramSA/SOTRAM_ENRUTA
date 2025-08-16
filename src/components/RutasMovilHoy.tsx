'use client';

import { useState, useEffect } from 'react';
import { Clock, Car, User, CheckCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { TimeService } from '@/src/lib/timeService';

interface Turno {
  id: number;
  horaSalida: string;
  ruta: { id: number; nombre: string } | null;
  movil: { id: number; movil: string };
  conductor: { id: number; nombre: string };
  estado: string;
  tipo?: 'turno' | 'programado';
}

interface RutasMovilHoyProps {
  movilId: number;
  movilNombre: string;
}

export default function RutasMovilHoy({ movilId, movilNombre }: RutasMovilHoyProps) {
  const [rutas, setRutas] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRutas = async () => {
      try {
        console.log('🔍 RutasMovilHoy: Iniciando fetch para móvil:', movilId, movilNombre);
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/movil/${movilId}/rutas-hoy`, {
          headers: {
            ...TimeService.getSimulationHeaders()
          }
        });
        
        console.log('🔍 RutasMovilHoy: Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('🔍 RutasMovilHoy: Error response:', errorText);
          throw new Error(`Error al obtener las rutas: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('🔍 RutasMovilHoy: Data recibida:', data);
        
        setRutas(data.data || []);
      } catch (err) {
        console.error('🔍 RutasMovilHoy: Error en fetch:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (movilId && movilId > 0) {
      fetchRutas();
    } else {
      console.log('🔍 RutasMovilHoy: movilId inválido:', movilId);
      setRutas([]);
      setLoading(false);
    }
  }, [movilId, movilNombre]);

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'COMPLETADO':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'EN_CURSO':
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case 'PENDIENTE':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'PROGRAMADO':
        return <Clock className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'COMPLETADO':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'EN_CURSO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PROGRAMADO':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatHora = (horaSalida: string) => {
    return new Date(horaSalida).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Car className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Rutas del Móvil {movilNombre}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Hoy</span>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {rutas.length} rutas
          </span>
        </div>
      </div>

      {rutas.length === 0 ? (
        <div className="text-center py-8">
          <Car className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No hay rutas programadas para hoy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rutas.map((ruta) => (
            <div
              key={ruta.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                ruta.tipo === 'programado' 
                  ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">
                    {formatHora(ruta.horaSalida)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {ruta.conductor.nombre}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    ruta.tipo === 'programado' ? 'bg-orange-500' : 'bg-purple-500'
                  }`}></div>
                  <span className="font-medium text-gray-900">
                    {ruta.ruta?.nombre?.startsWith('DESPACHO') 
                      ? ruta.ruta.nombre 
                      : `Despacho ${ruta.ruta?.nombre || 'N/A'}`}
                  </span>
                </div>

                {ruta.tipo === 'programado' && (
                  <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded-full border border-orange-300">
                    PROGRAMADO
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {getEstadoIcon(ruta.estado)}
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getEstadoColor(ruta.estado)}`}>
                  {ruta.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 