'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Clock, User, MapPin, CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

interface Ruta {
  id: number;
  horaSalida: string;
  estado: string;
  tipo: string;
  conductor: {
    id: number;
    nombre: string;
  };
  ruta: {
    id: number;
    nombre: string;
  } | null;
  movilNombre: string;
  automovilId: number;
}

export interface TodasLasRutasHoyRef {
  actualizarRutas: (force?: boolean) => void;
}

interface TodasLasRutasHoyProps {
  className?: string;
}

const TodasLasRutasHoy = forwardRef<TodasLasRutasHoyRef, TodasLasRutasHoyProps>(
  ({ className = '' }, ref) => {
    const [rutas, setRutas] = useState<Ruta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    // Estado para reordenamiento de grupos (drag & drop)
    const [groupOrder, setGroupOrder] = useState<string[]>([]);
    const [reorganizar, setReorganizar] = useState<boolean>(false);
    const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
    const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
    // Detectar ancho de pantalla para decidir una o dos columnas
    const [isTwoCols, setIsTwoCols] = useState<boolean>(false);

    useEffect(() => {
      if (typeof window === 'undefined') return;
      const mq = window.matchMedia('(min-width: 1024px)'); // lg breakpoint
      const update = () => setIsTwoCols(mq.matches);
      update();
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }, []);

    const fetchRutas = async (force?: boolean) => {
      try {
        setLoading(true);
        setError(null);
        
        const url = force ? '/api/rutas/todas-hoy?force=1' : '/api/rutas/todas-hoy';
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
          setRutas(data.data || []);
        } else {
          setError('Error al cargar las rutas');
        }
      } catch (error) {
        console.error('Error fetching rutas:', error);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchRutas();
    }, []);

    useImperativeHandle(ref, () => ({
      actualizarRutas: (force?: boolean) => fetchRutas(force)
    }));

    // Inicializar/actualizar el orden de grupos cuando cambian los datos (antes de returns)
    useEffect(() => {
      const grupos = Object.keys(agruparRutasPorDespacho(rutas));
      const LS_KEY = 'enruta_todas_rutas_order';
      let fromLS: string[] = [];
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) : null;
        if (raw) fromLS = JSON.parse(raw);
      } catch {}

      setGroupOrder((prev) => {
        if (prev && prev.length > 0) {
          const filtered = prev.filter((g) => grupos.includes(g));
          const missing = grupos.filter((g) => !filtered.includes(g));
          return [...filtered, ...missing];
        }
        if (fromLS && fromLS.length > 0) {
          const filtered = fromLS.filter((g) => grupos.includes(g));
          const missing = grupos.filter((g) => !filtered.includes(g));
          return [...filtered, ...missing];
        }
        return grupos;
      });
    }, [rutas]);

    // Persistir cambios de orden en localStorage (antes de returns)
    useEffect(() => {
      const LS_KEY = 'enruta_todas_rutas_order';
      try {
        if (groupOrder && groupOrder.length > 0 && typeof window !== 'undefined') {
          window.localStorage.setItem(LS_KEY, JSON.stringify(groupOrder));
        }
      } catch {}
    }, [groupOrder]);

    // Función para agrupar rutas por despacho (A y B juntos)
    const agruparRutasPorDespacho = (rutas: Ruta[]) => {
      const grupos: { [key: string]: Ruta[] } = {};
      
      rutas.forEach(ruta => {
        const nombreRuta = ruta.ruta?.nombre || 'Sin Ruta';
        let grupoKey = nombreRuta;
        
        // Agrupar Despacho A y Despacho B en el mismo grupo
        if (nombreRuta === 'Despacho A' || nombreRuta === 'Despacho B') {
          grupoKey = 'Despacho A/B';
        }
        
        if (!grupos[grupoKey]) {
          grupos[grupoKey] = [];
        }
        grupos[grupoKey].push(ruta);
      });
      
      return grupos;
    };

    // Función para obtener el color del card basado en el grupo
    const getCardColor = (grupoNombre: string) => {
      if (grupoNombre === 'Despacho A/B') {
        return 'border-purple-200 bg-purple-50';
      }
      
      // Colores para otros despachos/rutas
      const colores = [
        'border-yellow-200 bg-yellow-50',
        'border-red-200 bg-red-50',
        'border-indigo-200 bg-indigo-50',
        'border-pink-200 bg-pink-50',
        'border-gray-200 bg-gray-50'
      ];
      
      // Usar hash simple para asignar color consistente
      const hash = grupoNombre.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      return colores[Math.abs(hash) % colores.length];
    };

    // Función para obtener el color del título basado en el grupo
    const getTitleColor = (grupoNombre: string) => {
      if (grupoNombre === 'Despacho A/B') {
        return 'text-purple-800';
      }
      
      const colores = [
        'text-yellow-800',
        'text-red-800',
        'text-indigo-800',
        'text-pink-800',
        'text-gray-800'
      ];
      
      const hash = grupoNombre.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      return colores[Math.abs(hash) % colores.length];
    };

    const getEstadoIcon = (estado: string) => {
      const e = estado.toUpperCase();
      if (e.startsWith('COMPLETADO')) return <CheckCircle className="w-4 h-4 text-green-600" />;
      if (e === 'NO_COMPLETADO') return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      if (e === 'CANCELADO') return <XCircle className="w-4 h-4 text-red-600" />;
      return <Clock className="w-4 h-4 text-gray-600" />;
    };

    const getEstadoColor = (estado: string) => {
      const e = estado.toUpperCase();
      if (e.startsWith('COMPLETADO')) return 'text-green-600 bg-green-100';
      if (e === 'NO_COMPLETADO') return 'text-yellow-600 bg-yellow-100';
      if (e === 'CANCELADO') return 'text-red-600 bg-red-100';
      return 'text-gray-600 bg-gray-100';
    };

    function isoToTimeHHMM(isoString: string) { 
      const date = new Date(isoString); 
      const hours = String(date.getUTCHours()).padStart(2, "0"); 
      const minutes = String(date.getUTCMinutes()).padStart(2, "0"); 
      return `${hours}:${minutes}`; 
    }

    if (loading) {
      return (
        <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
          <div className="text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </div>
      );
    }

    if (rutas.length === 0) {
      return (
        <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Todas las Rutas de Hoy
          </h3>
          <div className="text-center text-gray-500">
            <MapPin className="w-8 h-8 mx-auto mb-2" />
            <p>No hay rutas programadas para hoy</p>
          </div>
        </div>
      );
    }

    const rutasAgrupadas = agruparRutasPorDespacho(rutas);

    // Dividir los grupos en dos columnas de manera equilibrada
    const gruposEntries = Object.entries(rutasAgrupadas);
    const columna1: [string, Ruta[]][] = [];
    const columna2: [string, Ruta[]][] = [];

    // Utilidades para ordenar por hora
    const getHoraMs = (r: Ruta) => new Date(r.horaSalida).getTime();
    const getEarliestMs = (rs: Ruta[]) => {
      if (!rs || rs.length === 0) return Number.MAX_SAFE_INTEGER;
      return Math.min(...rs.map(getHoraMs));
    };

    // Ordenar grupos por su hora más temprana cuando no se está reorganizando manualmente
    const sortedByEarliest: [string, Ruta[]][] = [...gruposEntries].sort(
      (a, b) => getEarliestMs(a[1]) - getEarliestMs(b[1])
    );

    // Si el usuario activa "Reorganizar", respetar su orden; de lo contrario, usar el cronológico
    const orderedEntries: [string, Ruta[]][] = (!reorganizar)
      ? sortedByEarliest
      : (groupOrder && groupOrder.length > 0)
        ? groupOrder.filter((g) => rutasAgrupadas[g]).map((g) => [g, rutasAgrupadas[g]])
        : sortedByEarliest;

    orderedEntries.forEach(([grupoNombre, rutasGrupo], index) => {
      if (index % 2 === 0) {
        columna1.push([grupoNombre, rutasGrupo]);
      } else {
        columna2.push([grupoNombre, rutasGrupo]);
      }
    });

    // Función para toggle del estado colapsado de un grupo
    const toggleGroupCollapse = (grupoNombre: string) => {
      setCollapsedGroups(prev => {
        const newSet = new Set(prev);
        if (newSet.has(grupoNombre)) {
          newSet.delete(grupoNombre);
        } else {
          newSet.add(grupoNombre);
        }
        return newSet;
      });
    };

    const renderGrupo = ([grupoNombre, rutasGrupo]: [string, Ruta[]]) => {
      const isCollapsed = collapsedGroups.has(grupoNombre);
      const isDragOver = dragOverGroup === grupoNombre;

      return (
        <div
          key={grupoNombre}
          className={`bg-white rounded-lg shadow-sm border-2 p-4 mb-4 ${getCardColor(grupoNombre)} ${reorganizar ? 'cursor-move' : ''} ${isDragOver ? 'ring-2 ring-blue-400' : ''}`}
          draggable={reorganizar}
          onDragStart={() => setDraggedGroup(grupoNombre)}
          onDragOver={(e) => { if (reorganizar) { e.preventDefault(); setDragOverGroup(grupoNombre); } }}
          onDragLeave={() => { if (reorganizar) setDragOverGroup(null); }}
          onDrop={() => {
            if (!reorganizar || !draggedGroup || draggedGroup === grupoNombre) return;
            setGroupOrder((prev) => {
              const withoutDragged = prev.filter((g) => g !== draggedGroup);
              const targetIndex = withoutDragged.indexOf(grupoNombre);
              const newOrder = [...withoutDragged];
              newOrder.splice(targetIndex, 0, draggedGroup);
              return newOrder;
            });
            setDragOverGroup(null);
            setDraggedGroup(null);
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {reorganizar && (
                <GripVertical className="w-4 h-4 text-gray-500" />
              )}
              <h4 className={`font-semibold text-lg ${getTitleColor(grupoNombre)}`}>
                {grupoNombre}
              </h4>
              <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded-full">
                {rutasGrupo.length} ruta{rutasGrupo.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReorganizar((v) => !v)}
                className={`px-2 py-1 text-xs rounded border ${reorganizar ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-700 border-gray-300'} hover:bg-gray-100`}
                title={reorganizar ? 'Salir de reorganización' : 'Reorganizar'}
              >
                {reorganizar ? 'Reorganizar: ON' : 'Reorganizar'}
              </button>
              <button
                onClick={() => toggleGroupCollapse(grupoNombre)}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                title={isCollapsed ? 'Expandir' : 'Colapsar'}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
          
          {!isCollapsed && (
            <div className="space-y-3">
              {/* Ordenar las rutas del grupo por hora de salida (UTC) */}
              {[...rutasGrupo]
                .sort((a, b) => new Date(a.horaSalida).getTime() - new Date(b.horaSalida).getTime())
                .map((ruta) => (
                <div
                  key={`${ruta.id}-${ruta.automovilId}`}
                  className="bg-white rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-800">
                        {isoToTimeHHMM(ruta.horaSalida)}
                      </span>
                      <span className="text-sm text-gray-600">
                        Móvil {ruta.movilNombre}
                      </span>
                      <span className={`font-semibold text-sm ${
                          ruta.ruta?.nombre === 'Despacho A' ? 'text-blue-500' : 
                          ruta.ruta?.nombre === 'Despacho B' ? 'text-green-500' : 
                          'text-gray-600'
                        }`}>
                        {ruta.ruta?.nombre}
                      </span>
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getEstadoColor(ruta.estado)}`}>
                      {getEstadoIcon(ruta.estado)}
                      <span className="capitalize">{ruta.estado.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{ruta.conductor.nombre}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        ruta.tipo === 'turno' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {ruta.tipo === 'turno' ? 'Turno' : 'Programado'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className={`${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Todas las Rutas de Hoy ({rutas.length} rutas)
        </h3>
        {isTwoCols ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-0">{columna1.map(renderGrupo)}</div>
            <div className="space-y-0">{columna2.map(renderGrupo)}</div>
          </div>
        ) : (
          <div className="space-y-0">
            {orderedEntries.map(renderGrupo)}
          </div>
        )}
      </div>
    );
  }
);

TodasLasRutasHoy.displayName = 'TodasLasRutasHoy';

export default TodasLasRutasHoy;