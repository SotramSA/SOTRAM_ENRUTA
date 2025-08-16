'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  TimeController,
  AutoComplete,
  Modal,
  ValidationMessage
} from '@/src/components/ui';
import { Clock, Car, User, Route, Plus, RotateCcw, CheckCircle, AlertCircle, ChevronDown, ChevronRight, X, Trash2, Printer } from 'lucide-react';
import { useNotifications } from '@/src/lib/notifications';
import { TimeService } from '@/src/lib/timeService';
import { safeFetch } from '@/src/lib/utils';
import type { Turno, HuecoDisponible, EstadisticaRotacion, AsignacionAutomatica } from '@/src/lib/turnoService';
import type { ValidacionResult } from '@/src/lib/validacionService';
import RutasMovilHoy from '@/src/components/RutasMovilHoy';


interface Automovil {
  id: number;
  movil: string;
  placa: string;
  activo: boolean;
}

interface Conductor {
  id: number;
  nombre: string;
  cedula: string;
  activo: boolean;
}

export default function TurnoPage() {
  const notifications = useNotifications();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [huecos, setHuecos] = useState<HuecoDisponible[]>([]);
  const [programadosDisponibles, setProgramadosDisponibles] = useState<HuecoDisponible[]>([]);
  const [programadosAsignados, setProgramadosAsignados] = useState<Turno[]>([]);
  const [automoviles, setAutomoviles] = useState<Automovil[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [conductoresPorAutomovil, setConductoresPorAutomovil] = useState<{[key: number]: Conductor[]}>({});
  const [automovilSeleccionado, setAutomovilSeleccionado] = useState<string>('');
  const [conductorSeleccionado, setConductorSeleccionado] = useState<string>('');
  const [automovilBusqueda, setAutomovilBusqueda] = useState<string>('');
  const [asignacionAutomatica, setAsignacionAutomatica] = useState<AsignacionAutomatica | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAsignacion, setLoadingAsignacion] = useState(false);
  const [cardsAbiertos, setCardsAbiertos] = useState<{[key: string]: boolean}>({});
  const [limpiandoFormulario, setLimpiandoFormulario] = useState(false);
  const [limpiandoHuecos, setLimpiandoHuecos] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteTurnoModal, setShowDeleteTurnoModal] = useState(false);
  const [turnoAEliminar, setTurnoAEliminar] = useState<Turno | null>(null);
  const [validacion, setValidacion] = useState<ValidacionResult | null>(null);
  const [validando, setValidando] = useState(false);

  const [configuracionImpresora, setConfiguracionImpresora] = useState<{
    impresoraHabilitada: boolean;
    impresionDirecta: boolean;
    nombreImpresora: string | null;
  } | null>(null);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (automovilSeleccionado) {
      cargarConductoresPorAutomovil(parseInt(automovilSeleccionado));
    }
  }, [automovilSeleccionado]);

  useEffect(() => {
    // No cargar huecos si se está limpiando el formulario
    // Esta bandera se mantiene activa después de asignar turnos para evitar recargas automáticas
    if (limpiandoFormulario) {
      return;
    }
    
    // Verificar que ambos valores sean válidos (no vacíos y números válidos)
    if (automovilSeleccionado && conductorSeleccionado && 
        automovilSeleccionado.trim() !== '' && conductorSeleccionado.trim() !== '' &&
        !isNaN(parseInt(automovilSeleccionado)) && !isNaN(parseInt(conductorSeleccionado))) {
      validarAntesDeCargar();
    } else {
      setHuecos([]);
      setAsignacionAutomatica(null);
      setValidacion(null);
    }
  }, [automovilSeleccionado, conductorSeleccionado, limpiandoFormulario]);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      
      // Cargar configuración de impresora
      console.debug('🔎 Fetching: /api/configuracion');
      const configResult = await safeFetch('/api/configuracion');
      if (configResult.success) {
        setConfiguracionImpresora({
          impresoraHabilitada: configResult.data.impresoraHabilitada || false,
          impresionDirecta: configResult.data.impresionDirecta || false,
          nombreImpresora: configResult.data.nombreImpresora
        });
      } else {
        // Si no hay configuración (404), continuar sin bloquear la carga inicial
        // Otros errores sí se notificarán pero no detendrán el flujo
        if (configResult.error?.includes('404')) {
          console.warn('Configuración no encontrada (404). Continuando con valores por defecto.');
        } else if (configResult.error) {
          console.warn('Error cargando configuración:', configResult.error);
        }
      }
      
      // Cargar automóviles activos
      console.debug('🔎 Fetching: /api/automoviles/activos');
      const automovilesResult = await safeFetch('/api/automoviles/activos');
      if (!automovilesResult.success) {
        throw new Error(`Error cargando automóviles: ${automovilesResult.error}`);
      }
      setAutomoviles(automovilesResult.data);

      // Cargar conductores activos
      console.debug('🔎 Fetching: /api/conductores/activos');
      const conductoresResult = await safeFetch('/api/conductores/activos');
      if (!conductoresResult.success) {
        throw new Error(`Error cargando conductores: ${conductoresResult.error}`);
      }
      // El endpoint devuelve { conductores: [...] }
      setConductores(
        Array.isArray(conductoresResult.data)
          ? conductoresResult.data
          : (conductoresResult.data?.conductores ?? [])
      );

      // Cargar turnos del día
      await cargarTurnosDelDia(true); // Actualizar cards en carga inicial
      
      // Cargar programados automáticamente
      await cargarProgramados();
      
      // Abrir todos los cards por defecto después de cargar todos los datos
      setTimeout(() => {
        const todasLasRutas: string[] = [];
        
        // Agregar rutas de turnos
        turnos.forEach(t => {
          if (t.ruta?.nombre) {
            todasLasRutas.push(t.ruta.nombre);
          }
        });
        
        // Agregar rutas de huecos
        huecos.forEach(h => {
          if (!todasLasRutas.includes(h.rutaNombre)) {
            todasLasRutas.push(h.rutaNombre);
          }
        });
        
        // Agregar rutas de programados disponibles
        programadosDisponibles.forEach(p => {
          if (!todasLasRutas.includes(p.rutaNombre)) {
            todasLasRutas.push(p.rutaNombre);
          }
        });
        
        // Agregar rutas de programados asignados
        programadosAsignados.forEach(p => {
          if (p.ruta?.nombre && !todasLasRutas.includes(p.ruta.nombre)) {
            todasLasRutas.push(p.ruta.nombre);
          }
        });
        
        const cardsAbiertosPorDefecto: {[key: string]: boolean} = {};
        for (const ruta of todasLasRutas) {
          cardsAbiertosPorDefecto[ruta] = true;
        }
        setCardsAbiertos(cardsAbiertosPorDefecto);
      }, 100);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      notifications.error('Error cargando datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const cargarTurnosDelDia = async (actualizarCards: boolean = true) => {
    try {
      const result = await safeFetch('/api/turnos-programados', {
        headers: TimeService.getSimulationHeaders()
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      if (result.data.success) {
        // Mostrar información de debug en la consola
        if (result.data.debug) {
          console.log('🔍 Debug info del servidor (turnos-programados):', result.data.debug);
        }
        
        // Filtrar solo los turnos (excluir programados) para el estado de turnos
        const soloTurnos = result.data.eventos.filter((evento: any) => evento.tipo === 'turno');
        setTurnos(soloTurnos);
        
        // Solo actualizar cards si se solicita explícitamente
        if (actualizarCards) {
          // Abrir automáticamente los cards de las rutas que tienen eventos
          const rutasConEventos: string[] = [];
          result.data.eventos.forEach((evento: any) => {
            if (evento.ruta?.nombre) {
              rutasConEventos.push(evento.ruta.nombre);
            }
          });
          const cardsAbiertosPorDefecto: {[key: string]: boolean} = {};
          for (const ruta of rutasConEventos) {
            cardsAbiertosPorDefecto[ruta] = true;
          }
          setCardsAbiertos(prev => ({
            ...prev,
            ...cardsAbiertosPorDefecto
          }));
        }
        
        console.log('📊 Eventos cargados:', {
          totalEventos: result.data.eventos.length,
          turnos: soloTurnos.length,
          programados: result.data.eventos.filter((e: any) => e.tipo === 'programado').length
        });
      }
    } catch (error) {
      console.error('Error cargando turnos y programados:', error);
      notifications.error('Error cargando turnos del día');
    }
  };

  const cargarProgramados = async () => {
    try {
      console.log('🔄 Cargando programados del día...');
      
      const result = await safeFetch('/api/programados-huecos', {
        headers: TimeService.getSimulationHeaders()
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      if (result.data.success) {
        // Mostrar información de debug
        if (result.data.debug) {
          console.log('🔍 Debug info del servidor (programados):', result.data.debug);
        }
        
        setProgramadosDisponibles(result.data.programadosDisponibles || []);
        setProgramadosAsignados(result.data.programadosAsignados || []);
        
        console.log('📊 Programados cargados:', {
          disponibles: result.data.programadosDisponibles?.length || 0,
          asignados: result.data.programadosAsignados?.length || 0
        });
        
        // Abrir cards de rutas con programados
        const rutasConProgramados: string[] = [];
        result.data.programadosDisponibles?.forEach((p: any) => {
          if (p.rutaNombre && !rutasConProgramados.includes(p.rutaNombre)) {
            rutasConProgramados.push(p.rutaNombre);
          }
        });
        result.data.programadosAsignados?.forEach((p: any) => {
          if (p.ruta?.nombre && !rutasConProgramados.includes(p.ruta.nombre)) {
            rutasConProgramados.push(p.ruta.nombre);
          }
        });
        
        if (rutasConProgramados.length > 0) {
          const cardsAbiertosPorDefecto: {[key: string]: boolean} = {};
          for (const ruta of rutasConProgramados) {
            cardsAbiertosPorDefecto[ruta] = true;
          }
          setCardsAbiertos(prev => ({
            ...prev,
            ...cardsAbiertosPorDefecto
          }));
        }
      }
    } catch (error) {
      console.error('Error cargando programados:', error);
      // No mostrar error al usuario, los programados son opcionales
    }
  };

  const cargarConductoresPorAutomovil = async (automovilId: number) => {
    try {
      const result = await safeFetch(`/api/automoviles/${automovilId}/conductores`);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const conductoresActivos = result.data.filter((c: Conductor) => c.activo);
      setConductoresPorAutomovil(prev => ({
        ...prev,
        [automovilId]: conductoresActivos
      }));
    } catch (error) {
      console.error('Error cargando conductores:', error);
      notifications.error('Error cargando conductores del automóvil');
    }
  };

  const validarAntesDeCargar = async () => {
    // Validaciones adicionales para evitar llamadas innecesarias
    if (!automovilSeleccionado || !conductorSeleccionado || 
        automovilSeleccionado.trim() === '' || conductorSeleccionado.trim() === '') {
      console.log('🔍 Validación cancelada: valores vacíos o inválidos');
      return;
    }

    try {
      setValidando(true);
      setValidacion(null);
      
      const movilId = parseInt(automovilSeleccionado);
      const conductorId = parseInt(conductorSeleccionado);
      
              // Validar que los IDs sean números válidos
        if (isNaN(movilId) || isNaN(conductorId) || movilId <= 0 || conductorId <= 0) {
          console.error('❌ IDs inválidos:', { automovilSeleccionado, conductorSeleccionado, movilId, conductorId });
          notifications.error('IDs de móvil o conductor inválidos');
          return;
        }
      
      console.log('🔍 Enviando validación:', { 
        automovilSeleccionado, 
        conductorSeleccionado, 
        movilId, 
        conductorId 
      });
      
      const result = await safeFetch('/api/validaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...TimeService.getSimulationHeaders()
        },
        body: JSON.stringify({
          movilId,
          conductorId
        })
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const validacionResult = result.data.validacion;
      setValidacion(validacionResult);
      
      // Si no tiene planilla o tiene sanciones, no cargar huecos
      if (!validacionResult.tienePlanilla || validacionResult.tieneSanciones) {
        setHuecos([]);
        setAsignacionAutomatica(null);
        return;
      }
      
      // Solo cargar huecos si tiene planilla Y no tiene sanciones
      await cargarHuecosDisponibles();
      
    } catch (error) {
      console.error('Error en validación:', error);
      notifications.error('Error al validar planillas y sanciones');
      setValidacion(null);
    } finally {
      setValidando(false);
    }
  };

  const cargarHuecosDisponibles = async () => {
    if (!automovilSeleccionado || !conductorSeleccionado) return;

    try {
      setLoadingAsignacion(true);
      
      // Pequeño delay para mostrar el indicador de carga (opcional)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await safeFetch('/api/huecos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...TimeService.getSimulationHeaders()
        },
        body: JSON.stringify({
          movilId: parseInt(automovilSeleccionado),
          conductorId: parseInt(conductorSeleccionado)
        })
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const data = result.data;
      
      if (data.success) {
        // Mostrar información de debug en la consola
        if (data.debug) {
          console.log('🔍 Debug info del servidor (huecos):', data.debug);
        }
        
        setHuecos(data.huecos);
        setAsignacionAutomatica(data.asignacionAutomatica);
        console.log('✅ Huecos cargados exitosamente:', data.huecos.length, 'huecos disponibles');
        
        // Abrir automáticamente los cards de las rutas que tienen huecos
        const rutasConHuecos = data.huecos.map((h: HuecoDisponible) => h.rutaNombre);
        const cardsAbiertosPorDefecto: {[key: string]: boolean} = {};
        for (const ruta of rutasConHuecos) {
          cardsAbiertosPorDefecto[ruta] = true;
        }
        setCardsAbiertos(prev => ({
          ...prev,
          ...cardsAbiertosPorDefecto
        }));
      } else {
        setHuecos([]);
        setAsignacionAutomatica(null);
        notifications.error(
          typeof data.error === 'string' ? data.error : JSON.stringify(data.error || 'Error cargando huecos')
        );
      }
    } catch (error) {
      console.error('Error cargando huecos:', error);
      notifications.error('Error cargando huecos disponibles');
      setHuecos([]);
      setAsignacionAutomatica(null);
    } finally {
      setLoadingAsignacion(false);
    }
  };

  const asignarHueco = async (hueco: HuecoDisponible) => {
    if (!automovilSeleccionado || !conductorSeleccionado) {
      notifications.error('Selecciona un móvil y conductor');
      return;
    }

    // Verificar que tenga planilla antes de asignar
    if (validacion && !validacion.tienePlanilla) {
      notifications.error('No se puede asignar turnos sin planilla para el día de hoy');
      return;
    }

    // Verificar que no tenga sanciones antes de asignar
    if (validacion && validacion.tieneSanciones) {
      notifications.error('No se puede asignar turnos con sanciones activas');
      return;
    }

    try {
      setLoading(true);

      // Verificar si es un programado
      const esProgramado = (hueco as any).tipo === 'programado';
      
      if (esProgramado) {
        // Asignar programado
        const programadoId = (hueco as any).programadoId;
        const result = await safeFetch(`/api/programacion/${programadoId}/asignar`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...TimeService.getSimulationHeaders()
          },
          body: JSON.stringify({
            movilId: parseInt(automovilSeleccionado)
          }),
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        notifications.success('Programado asignado exitosamente');
        
        // Recargar programados y limpiar formulario
        await cargarProgramados();
        setAutomovilSeleccionado('');
        setConductorSeleccionado('');
        setAutomovilBusqueda('');
        setHuecos([]);
        setAsignacionAutomatica(null);
        setValidacion(null);
        setConductoresPorAutomovil({});
        
        return;
      }
      
      // Mostrar información de debug del cliente
      console.log('🔍 Debug info del cliente:', {
        currentTime: TimeService.getCurrentTime().toISOString(),
        isSimulationMode: TimeService.isSimulationMode(),
        simulatedTime: TimeService.getSimulatedTime()?.toISOString() || null,
        headers: TimeService.getSimulationHeaders()
      });
      
      const result = await safeFetch('/api/turnos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...TimeService.getSimulationHeaders()
        },
        body: JSON.stringify({
          movilId: parseInt(automovilSeleccionado),
          conductorId: parseInt(conductorSeleccionado),
          rutaId: hueco.rutaId,
          horaSalida: hueco.horaSalida
        }),
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const data = result.data;

      if (data.success) {
        // Mostrar información de debug en la consola
        if (data.debug) {
          console.log('🔍 Debug info del servidor:', data.debug);
        }
        
        notifications.success('Turno asignado exitosamente');
        
        // Imprimir recibo si está habilitado
        if (configuracionImpresora?.impresoraHabilitada && data.turnoId) {
          await imprimirRecibo(data.turnoId);
        }
        
        // Limpiar completamente el estado del formulario ANTES de recargar datos
        setLimpiandoFormulario(true);
        setAutomovilSeleccionado('');
        setConductorSeleccionado('');
        setAutomovilBusqueda('');
        setHuecos([]);
        setAsignacionAutomatica(null);
        setValidacion(null);
        setConductoresPorAutomovil({});
        setCardsAbiertos({});
        
        // Recargar datos después de limpiar el formulario (sin modificar cardsAbiertos)
        await cargarTurnosDelDia(false); // No actualizar cards para evitar doble carga
        
        // Resetear la bandera después de un delay para permitir nuevas consultas
        setTimeout(() => {
          setLimpiandoFormulario(false);
          console.log('✅ Bandera de limpieza reseteada, listo para nuevas consultas');
        }, 100);
        
        console.log('✅ Turno asignado exitosamente, formulario limpiado para nueva consulta');
      } else if (data.huecosRegenerados) {
        // Caso especial: huecos regenerados
        console.log('🔄 Huecos regenerados, recargando datos...');
        notifications.info(data.error || 'Los huecos han sido regenerados. Recargando datos...');
        
        // Recargar huecos automáticamente
        if (automovilSeleccionado && conductorSeleccionado) {
          await cargarHuecosDisponibles();
        }
      } else {
        const errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error || 'Error asignando turno');
        
        // Mostrar mensaje de error más específico
        if (errorMessage.includes('ya tiene un turno asignado')) {
          notifications.error(`❌ Conflicto: ${errorMessage}`);
        } else if (errorMessage.includes('tiempo mínimo')) {
          notifications.error(`⏰ Error de tiempo: ${errorMessage}`);
        } else if (errorMessage.includes('pasado')) {
          notifications.error(`⏰ Error de hora: ${errorMessage}`);
        } else {
          notifications.error(errorMessage);
        }
        
        // Si es un error de conflicto, recargar los huecos para mostrar opciones actualizadas
        if (errorMessage.includes('ya tiene un turno asignado') || errorMessage.includes('conflicto')) {
          console.log('🔄 Error de conflicto detectado, recargando huecos...');
          setTimeout(() => {
            if (automovilSeleccionado && conductorSeleccionado) {
              cargarHuecosDisponibles();
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error asignando turno:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error asignando turno';
      
      // Mostrar mensaje de error más específico
      if (errorMessage.includes('HTTP error! status: 409')) {
        notifications.error('❌ Conflicto: El móvil o conductor ya tiene un turno asignado en ese horario');
        console.log('🔄 Error de conflicto HTTP 409 detectado, recargando huecos...');
        setTimeout(() => {
          if (automovilSeleccionado && conductorSeleccionado) {
            cargarHuecosDisponibles();
          }
        }, 1000);
      } else if (errorMessage.includes('HTTP error! status: 400')) {
        notifications.error('⏰ Error: Verifica la hora de salida seleccionada');
      } else {
        notifications.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setLimpiandoFormulario(true);
    
    // Limpiar todos los estados
    setAutomovilSeleccionado('');
    setConductorSeleccionado('');
    setAutomovilBusqueda('');
    setHuecos([]);
    setAsignacionAutomatica(null);
    setValidacion(null);
    setConductoresPorAutomovil({});
    setCardsAbiertos({});
    
    // Resetear la bandera después de un delay para permitir nuevas consultas
    setTimeout(() => {
      setLimpiandoFormulario(false);
      console.log('✅ Bandera de limpieza reseteada después de limpieza manual');
    }, 100);
    
    console.log('🧹 Formulario limpiado manualmente');
    notifications.success('Formulario limpiado');
  };

  const limpiarTodosLosHuecos = () => {
    setShowConfirmModal(true);
  };

  const confirmarLimpiezaHuecos = async () => {
    try {
      setLimpiandoHuecos(true);
      
      const result = await safeFetch('/api/huecos/limpiar', {
        method: 'DELETE'
      });
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      if (result.data.success) {
        notifications.success(result.data.message);
        
        // Recargar datos para reflejar los cambios
        await cargarDatosIniciales();
        
        // Limpiar el formulario si hay huecos mostrados
        if (huecos.length > 0) {
          limpiarFormulario();
        }
      } else {
        notifications.error(result.data.error || 'Error al limpiar huecos');
      }
    } catch (error) {
      console.error('Error limpiando huecos:', error);
      notifications.error('Error al limpiar los huecos de la base de datos');
    } finally {
      setLimpiandoHuecos(false);
    }
  };

  const eliminarTurno = (turno: Turno) => {
    setTurnoAEliminar(turno);
    setShowDeleteTurnoModal(true);
  };

  const confirmarEliminarTurno = async () => {
    if (!turnoAEliminar) return;
    
    try {
      setLoading(true);
      const result = await safeFetch(`/api/turnos/${turnoAEliminar.id}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        notifications.success('Turno eliminado exitosamente');
        await cargarTurnosDelDia(true);
      } else {
        notifications.error(`Error eliminando turno: ${result.error}`);
      }
    } catch (error) {
      console.error('Error eliminando turno:', error);
      notifications.error('Error eliminando turno');
    } finally {
      setLoading(false);
      setShowDeleteTurnoModal(false);
      setTurnoAEliminar(null);
    }
  };

  const toggleCard = (rutaNombre: string) => {
    setCardsAbiertos(prev => ({
      ...prev,
      [rutaNombre]: !prev[rutaNombre]
    }));
  };

  const getRutaColor = (rutaNombre: string) => {
    switch (rutaNombre) {
      case 'A': return 'bg-blue-500';
      case 'B': return 'bg-green-500';
      case 'C': return 'bg-purple-500';
      case 'DESPACHO D. RUT7 CORZO LORETO': return 'bg-orange-500';
      case 'DESPACHO E RUT7 CORZO': return 'bg-cyan-500';
      case 'DESPACHO D RUT4 PAMPA-CORZO': return 'bg-rose-500';
      default: return 'bg-gray-500';
    }
  };

  const getRutaColorLight = (rutaNombre: string) => {
    switch (rutaNombre) {
      case 'A': return 'bg-blue-50 border-blue-200';
      case 'B': return 'bg-green-50 border-green-200';
      case 'C': return 'bg-purple-50 border-purple-200';
      case 'DESPACHO D. RUT7 CORZO LORETO': return 'bg-orange-50 border-orange-200';
      case 'DESPACHO E RUT7 CORZO': return 'bg-cyan-50 border-cyan-200';
      case 'DESPACHO D RUT4 PAMPA-CORZO': return 'bg-rose-50 border-rose-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'ROTACION': return 'bg-green-100 text-green-800';
      case 'MISMA_RUTA': return 'bg-yellow-100 text-yellow-800';
      case 'CUALQUIERA': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE': return 'bg-blue-100 text-blue-800';
      case 'EN_CURSO': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETADO': return 'bg-green-100 text-green-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };



  const generarMensajeValidacion = () => {
    if (!validacion) return null;

    // Si no tiene planilla, mostrar error
    if (!validacion.tienePlanilla) {
      return (
        <ValidationMessage
          type="error"
          title="Sin Planilla para Hoy"
          message="El móvil seleccionado no tiene una planilla activa para el día de hoy. No se pueden asignar turnos sin planilla."
        />
      );
    }

    // Si tiene sanciones, mostrar error (no se pueden asignar turnos)
    if (validacion.tieneSanciones) {
      const detalles: string[] = [];

      // Agregar detalles de sanciones del automóvil
      if (validacion.sancionesAutomovil.length > 0) {
        validacion.sancionesAutomovil.forEach(sancion => {
          // Asegurar que las fechas sean objetos Date válidos
          const fechaInicio = sancion.fechaInicio instanceof Date ? sancion.fechaInicio : new Date(sancion.fechaInicio);
          const fechaFin = sancion.fechaFin instanceof Date ? sancion.fechaFin : new Date(sancion.fechaFin);
          
          const esUnDia = fechaInicio.toDateString() === fechaFin.toDateString();
          const fechaTexto = esUnDia 
            ? fechaInicio.toLocaleDateString('es-ES', { timeZone: 'UTC' })
            : `${fechaInicio.toLocaleDateString('es-ES', { timeZone: 'UTC' })} - ${fechaFin.toLocaleDateString('es-ES', { timeZone: 'UTC' })}`;
          
          detalles.push(`🚗 Automóvil: ${sancion.motivo} (${fechaTexto})`);
        });
      }

      // Agregar detalles de sanciones del conductor
      if (validacion.sancionesConductor.length > 0) {
        validacion.sancionesConductor.forEach(sancion => {
          // Asegurar que las fechas sean objetos Date válidos
          const fechaInicio = sancion.fechaInicio instanceof Date ? sancion.fechaInicio : new Date(sancion.fechaInicio);
          const fechaFin = sancion.fechaFin instanceof Date ? sancion.fechaFin : new Date(sancion.fechaFin);
          
          const esUnDia = fechaInicio.toDateString() === fechaFin.toDateString();
          const fechaTexto = esUnDia 
            ? fechaInicio.toLocaleDateString('es-ES', { timeZone: 'UTC' })
            : `${fechaInicio.toLocaleDateString('es-ES', { timeZone: 'UTC' })} - ${fechaFin.toLocaleDateString('es-ES', { timeZone: 'UTC' })}`;
          
          detalles.push(`👤 Conductor: ${sancion.motivo} (${fechaTexto})`);
        });
      }

      return (
        <ValidationMessage
          type="error"
          title="Sanciones Activas Detectadas"
          message="No se pueden asignar turnos debido a las siguientes sanciones activas para el día de hoy:"
          details={detalles}
        />
      );
    }

    return null;
  };

  const formatHora = (hora: string) => {
    try {
      const fecha = new Date(hora);
      if (isNaN(fecha.getTime())) {
        return 'Hora inválida';
      }
      return fecha.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando hora:', hora, error);
      return 'Error';
    }
  };

  const imprimirRecibo = async (turnoId: number) => {
    try {
      console.log('🖨️ Iniciando impresión de recibo para turno:', turnoId);
      
      const response = await fetch(`/api/turnos/${turnoId}/recibo`);
      
      console.log('🖨️ Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (response.ok) {
        const reciboData = await response.json();
        console.log('🖨️ Datos del recibo:', reciboData);
        
        // Crear ventana de impresión
        const printWindow = window.open('', '_blank');
        if (printWindow && reciboData) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Recibo de Turno</title>
                <style>
                  @media print {
                    @page {
                      size: 80mm auto;
                      margin: 0;
                    }
                    body {
                      margin: 0;
                      padding: 10px;
                      font-family: 'Courier New', monospace;
                      font-size: 12px;
                      line-height: 1.2;
                    }
                  }
                  body {
                    margin: 0;
                    padding: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    line-height: 1.1;
                    width: 80mm;
                    max-width: 80mm;
                  }
                  .header {
                    text-align: center;
                    margin-bottom: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                  }
                  .logo {
                    width: 30px;
                    height: 30px;
                    display: block;
                  }
                  .company-name {
                    font-size: 12px;
                    font-weight: bold;
                  }
                  .title {
                    font-size: 12px;
                    font-weight: bold;
                    text-align: center;
                    margin: 4px 0;
                    border-bottom: 1px solid #000;
                    padding-bottom: 2px;
                  }
                  .main-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin: 4px 0;
                  }
                  .left-section {
                    flex: 1;
                  }
                  .right-section {
                    flex: 0 0 80px;
                    text-align: center;
                  }
                  .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 2px 0;
                    padding: 0 2px;
                  }
                  .label {
                    font-weight: bold;
                    font-size: 11px;
                  }
                  .value {
                    text-align: right;
                    font-size: 11px;
                  }
                  .hora-salida {
                    font-size: 16px;
                    font-weight: bold;
                    text-align: center;
                    margin: 6px 0;
                    padding: 4px;
                  }
                  .ruta-destacada {
                    font-size: 22px;
                    font-weight: bold;
                    text-align: center;
                    margin: 6px 0;
                    padding: 6px;
                  }

                  .footer {
                    text-align: center;
                    margin-top: 4px;
                    font-size: 8px;
                    border-top: 1px solid #000;
                    padding-top: 2px;
                  }
                  .divider {
                    border-top: 1px dashed #000;
                    margin: 2px 0;
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <img src="/logo png.png" alt="Logo" class="logo" />
                  <div class="company-name">SOTRAM S.A</div>
                </div>
                
                <div class="title">PLANILLA DE VIAJE No. ${reciboData.id}</div>
                
                <!-- Hora de salida destacada -->
                <div class="hora-salida">
                  Hora de salida: ${reciboData.horaSalida}
                </div>
                
                <!-- Ruta destacada -->
                <div class="ruta-destacada">
                  Ruta: ${reciboData.ruta}
                </div>
                
                <div class="main-info">
                  <div class="left-section">
                    <div class="info-row">
                      <span class="label">Fecha:</span>
                      <span class="value">${reciboData.fechaSalida}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Móvil:</span>
                      <span class="value">${reciboData.movil}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Placa:</span>
                      <span class="value">${reciboData.placa}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Conductor:</span>
                      <span class="value">${reciboData.conductor}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Despachado:</span>
                      <span class="value">${reciboData.despachadoPor}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Registro:</span>
                      <span class="value">${reciboData.registro}</span>
                    </div>
                  </div>
                  

                </div>
                
                <div class="footer">
                  EnRuta 2025
                </div>
              </body>
            </html>
          `);
          
          printWindow.document.close();
          
          // Manejar impresión
          setTimeout(() => {
            // Manejar impresión según configuración
            if (configuracionImpresora?.impresionDirecta) {
              console.log('🖨️ Impresión directa habilitada - intentando imprimir automáticamente...');
              // Nota: Los navegadores siempre muestran el diálogo por seguridad
              // Pero podemos intentar usar la impresora predeterminada
              printWindow.focus();
              printWindow.print();
              // La ventana permanecerá abierta para que el usuario pueda ver el recibo
            } else {
              console.log('🖨️ Mostrando diálogo de impresión para confirmación...');
              printWindow.focus();
              printWindow.print();
              // La ventana permanecerá abierta para que el usuario pueda ver el recibo
            }
          }, 100);
        }
      } else {
        const errorText = await response.text();
        console.error('🖨️ Error en la respuesta de la API:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        notifications.error(`Error al generar el recibo: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('🖨️ Error al imprimir recibo:', error);
      notifications.error('Error al imprimir el recibo');
    }
  };

  // Combinar huecos de turnos con programados disponibles
  const todosLosHuecos = [...huecos, ...programadosDisponibles];
  
  // Agrupar huecos por ruta (incluyendo programados)
  const huecosPorRuta = todosLosHuecos.reduce((acc, hueco) => {
    if (!acc[hueco.rutaNombre]) {
      acc[hueco.rutaNombre] = [];
    }
    acc[hueco.rutaNombre].push(hueco);
    return acc;
  }, {} as {[key: string]: HuecoDisponible[]});

  // Combinar turnos con programados asignados
  const todosLosTurnos = [...turnos, ...programadosAsignados];
  
  // Agrupar turnos por ruta (incluyendo programados asignados)
  const turnosPorRuta = todosLosTurnos.reduce((acc, turno) => {
    if (turno.ruta) {
      if (!acc[turno.ruta.nombre]) {
        acc[turno.ruta.nombre] = [];
      }
      acc[turno.ruta.nombre].push(turno);
    }
    return acc;
  }, {} as {[key: string]: Turno[]});

  // Obtener rutas únicas
  const rutasUnicas = [...new Set([...Object.keys(huecosPorRuta), ...Object.keys(turnosPorRuta)])];

  // Preparar opciones para el autocompletado de automóviles
  const opcionesAutomoviles = automoviles.map(automovil => ({
    id: automovil.id,
    label: automovil.movil,
    subtitle: automovil.placa
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Turnos Inteligente</h1>
              <p className="text-gray-600 mt-1">Asignación automática con rotación entre Despachos A, B y C</p>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>🔄 Sistema Integrado:</strong> Los programados (4:50-7:00 AM) se muestran automáticamente como huecos disponibles. 
                  Los turnos respetan horarios: Despachos A/B inician a las 7:00 AM y Despacho C a las 8:30 AM cuando hay programados.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={limpiarTodosLosHuecos}
                variant="outline"
                disabled={limpiandoHuecos}
                className="flex items-center gap-2 bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
              >
                {limpiandoHuecos ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                ) : (
                  <X className="h-4 w-4" />
                )}
                {limpiandoHuecos ? 'Limpiando...' : 'Limpiar Huecos'}
              </Button>
              <Button
                onClick={cargarDatosIniciales}
                variant="outline"
                className="flex items-center gap-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <RotateCcw className="h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </div>
        </div>

        {/* Controlador de Hora */}
        <div className="mb-6">
          <TimeController />
        </div>



        {/* Selector de móvil y conductor */}
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Plus className="h-6 w-6" />
              Asignar Nuevo Turno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Automóvil</label>
                <AutoComplete
                  options={opcionesAutomoviles}
                  value={automovilBusqueda}
                  onValueChange={(newValue) => {
                    setAutomovilBusqueda(newValue);
                    // Si el valor se limpia, también limpiar la selección
                    if (!newValue.trim()) {
                      setAutomovilSeleccionado('');
                      setConductorSeleccionado('');
                    }
                  }}
                  onSelect={(option) => {
                    setAutomovilSeleccionado(option.id.toString());
                    setAutomovilBusqueda(option.label);
                  }}
                  placeholder="Buscar automóvil por nombre o placa..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conductor</label>
                <Select 
                  value={conductorSeleccionado} 
                  onValueChange={setConductorSeleccionado}
                  disabled={!automovilSeleccionado}
                >
                  <SelectTrigger className="w-full bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Selecciona un conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {automovilSeleccionado && conductoresPorAutomovil[parseInt(automovilSeleccionado)]?.map((conductor) => (
                      <SelectItem key={conductor.id} value={conductor.id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-600" />
                          <span>{conductor.nombre}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Botón de limpieza */}
              {(automovilSeleccionado || conductorSeleccionado || huecos.length > 0) && (
                <div className="col-span-full flex justify-end mt-4">
                  <Button
                    onClick={limpiarFormulario}
                    variant="outline"
                    className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 bg-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Limpiar Formulario
                  </Button>
                </div>
              )}
            </div>

            {/* Mensaje de validación */}
            {validando && (
              <div className="mt-4">
                <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700">Validando planillas y sanciones...</span>
                </div>
              </div>
            )}

            {!validando && generarMensajeValidacion()}
          </CardContent>
        </Card>

        {/* Rutas del Móvil Hoy */}
        {automovilSeleccionado && (
          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <CardContent className="p-6">
              <RutasMovilHoy
                movilId={parseInt(automovilSeleccionado)}
                movilNombre={automoviles.find(a => a.id.toString() === automovilSeleccionado)?.movil || ''}
              />
            </CardContent>
          </Card>
        )}

        {/* Indicador de carga para asignación automática */}
        {loadingAsignacion && automovilSeleccionado && conductorSeleccionado && (
          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 mb-1">Analizando mejores rutas...</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Calculando sugerencias inteligentes para {automoviles.find(a => a.id.toString() === automovilSeleccionado)?.movil} 
                    y {conductoresPorAutomovil[parseInt(automovilSeleccionado)]?.find(c => c.id.toString() === conductorSeleccionado)?.nombre}
                  </p>
                  <div className="flex justify-center gap-2 text-xs text-gray-500">
                    <span>• Verificando disponibilidad</span>
                    <span>• Calculando rotaciones</span>
                    <span>• Optimizando horarios</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Asignación Automática */}
        {asignacionAutomatica && !loadingAsignacion && (
          <Card className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <CheckCircle className="h-6 w-6 text-green-600" />
                Sugerencia Automática
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-800">Mejor Opción</h3>
                </div>
                <p className="text-green-700 mb-3">
                  {typeof asignacionAutomatica.razon === 'string' ? asignacionAutomatica.razon : JSON.stringify(asignacionAutomatica.razon)}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Ruta {asignacionAutomatica.mejorHueco.rutaNombre}</span>
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{formatHora(asignacionAutomatica.mejorHueco.horaSalida)}</span>
                  </div>
                  <Button
                    onClick={() => asignarHueco(asignacionAutomatica.mejorHueco)}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? 'Asignando...' : 'Confirmar Asignación'}
                  </Button>
                </div>
              </div>

              {asignacionAutomatica.alternativas.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Alternativas Disponibles</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {asignacionAutomatica.alternativas.map((hueco, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={getPrioridadColor(hueco.prioridad)}>
                            {hueco.prioridad}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Route className="h-3 w-3 text-gray-600" />
                            <span>Ruta {hueco.rutaNombre}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-600" />
                            <span>{formatHora(hueco.horaSalida)}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {typeof hueco.razon === 'string' ? hueco.razon : JSON.stringify(hueco.razon)}
                          </p>
                        </div>
                        <Button
                          onClick={() => asignarHueco(hueco)}
                          disabled={loading}
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Asignar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vista de Huecos y Turnos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Huecos Disponibles - LADO IZQUIERDO */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              Huecos Disponibles
              {automovilSeleccionado && conductorSeleccionado && (
                <Badge className="bg-orange-100 text-orange-800">
                  {loadingAsignacion ? (
                    <div className="flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600"></div>
                      Cargando...
                    </div>
                  ) : (
                    `${todosLosHuecos.length} huecos`
                  )}
                </Badge>
              )}
            </h2>
            
            {!automovilSeleccionado || !conductorSeleccionado ? (
              <div className="text-center py-8 text-gray-500">
                <Route className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Selecciona un móvil y conductor para ver los huecos disponibles</p>
              </div>
            ) : loadingAsignacion ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <h3 className="font-semibold text-gray-900 mb-2">Cargando sugerencias de ruta...</h3>
                <p className="text-sm text-gray-600">
                  Analizando mejores resultados para {automoviles.find(a => a.id.toString() === automovilSeleccionado)?.movil} 
                  y {conductoresPorAutomovil[parseInt(automovilSeleccionado)]?.find(c => c.id.toString() === conductorSeleccionado)?.nombre}
                </p>
              </div>
            ) : rutasUnicas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay huecos disponibles</p>
              </div>
            ) : (
              rutasUnicas.map((rutaNombre) => (
                <div key={rutaNombre} className={`rounded-lg border ${getRutaColorLight(rutaNombre)}`}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${getRutaColor(rutaNombre)}`}></div>
                      <h3 className="font-semibold text-gray-900">
                        {rutaNombre.startsWith('DESPACHO') ? rutaNombre : `Despacho ${rutaNombre}`}
                      </h3>
                      <Badge className="bg-white text-gray-700 border border-gray-300">
                        {huecosPorRuta[rutaNombre]?.length || 0} huecos
                      </Badge>
                    </div>
                  </div>
                  
                  {huecosPorRuta[rutaNombre] && huecosPorRuta[rutaNombre].length > 0 && (
                    <div className="px-4 pb-4 space-y-2">
                      {huecosPorRuta[rutaNombre].slice(0, 5).map((hueco, index) => (
                        <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${
                          (hueco as any).tipo === 'programado' 
                            ? 'border-orange-200 bg-orange-50' 
                            : 'border-gray-200 bg-white'
                        }`}>
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-gray-600" />
                            <span className="font-medium">{formatHora(hueco.horaSalida)}</span>
                            {(hueco as any).tipo === 'programado' ? (
                              <Badge className="bg-orange-100 text-orange-800 border border-orange-300">
                                PROGRAMADO
                              </Badge>
                            ) : (
                              <Badge className={getPrioridadColor(hueco.prioridad)}>
                                {hueco.prioridad}
                              </Badge>
                            )}
                          </div>
                          <Button
                            onClick={() => asignarHueco(hueco)}
                            disabled={loading}
                            variant="outline"
                            size="sm"
                            className={
                              (hueco as any).tipo === 'programado'
                                ? "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
                                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }
                          >
                            Asignar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Turnos Asignados - LADO DERECHO */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-blue-600" />
              Turnos Asignados
              <Badge className="bg-blue-100 text-blue-800">
                {todosLosTurnos.length} eventos
              </Badge>
            </h2>
            
            {rutasUnicas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay turnos asignados</p>
              </div>
            ) : (
              rutasUnicas.map((rutaNombre) => (
                <Card key={rutaNombre} className={`${getRutaColorLight(rutaNombre)}`}>
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCard(rutaNombre)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${getRutaColor(rutaNombre)}`}></div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {rutaNombre.startsWith('DESPACHO') ? rutaNombre : `Despacho ${rutaNombre}`}
                        </CardTitle>
                        <Badge className="bg-white text-gray-700 border border-gray-300">
                          {turnosPorRuta[rutaNombre]?.length || 0} turnos
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {cardsAbiertos[rutaNombre] ? (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {cardsAbiertos[rutaNombre] && (
                    <CardContent>
                      {turnosPorRuta[rutaNombre] && turnosPorRuta[rutaNombre].length > 0 ? (
                        <div className="space-y-2">
                          {turnosPorRuta[rutaNombre].map((turno) => (
                            <div key={turno.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                              (turno as any).tipo === 'programado' 
                                ? 'border-orange-200 bg-orange-50' 
                                : 'border-gray-200 bg-white'
                            }`}>
                              <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4 text-gray-600" />
                                <span className="font-medium">{formatHora(turno.horaSalida)}</span>
                                {(turno as any).tipo === 'programado' ? (
                                  <Badge className="bg-orange-100 text-orange-800 border border-orange-300">
                                    PROGRAMADO
                                  </Badge>
                                ) : (
                                  <>
                                    <Car className="h-4 w-4 text-gray-600" />
                                    <span>{turno.movil.movil}</span>
                                    <User className="h-4 w-4 text-gray-600" />
                                    <span>{turno.conductor.nombre}</span>
                                  </>
                                )}
                                {(turno as any).tipo === 'programado' && (
                                  <>
                                    <Car className="h-4 w-4 text-gray-600" />
                                    <span>{turno.movil.movil}</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {configuracionImpresora?.impresoraHabilitada && (turno as any).tipo !== 'programado' && (
                                  <Button
                                    onClick={() => imprimirRecibo(turno.id)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                )}
                                {(turno as any).tipo !== 'programado' && (
                                  <Button
                                    onClick={() => eliminarTurno(turno)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No hay turnos asignados</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación para Limpiar Huecos */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmarLimpiezaHuecos}
        title="Confirmar Limpieza de Huecos"
        message="¿Estás seguro de que quieres eliminar TODOS los huecos de la base de datos? Esta acción no se puede deshacer y afectará todos los huecos disponibles en el sistema."
        confirmText="Sí, Eliminar Todo"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal de Confirmación para Eliminar Turno */}
      <Modal
        isOpen={showDeleteTurnoModal}
        onClose={() => setShowDeleteTurnoModal(false)}
        onConfirm={confirmarEliminarTurno}
        title="Confirmar Eliminación de Turno"
        message={`¿Estás seguro de que quieres eliminar el turno de ${turnoAEliminar?.conductor.nombre} en el móvil ${turnoAEliminar?.movil.movil} para la ruta ${turnoAEliminar?.ruta?.nombre} a las ${turnoAEliminar ? formatHora(turnoAEliminar.horaSalida) : ''}? Esta acción no se puede deshacer.`}
        confirmText="Sí, Eliminar Turno"
        cancelText="Cancelar"
        variant="danger"
      />


    </div>
  );
} 