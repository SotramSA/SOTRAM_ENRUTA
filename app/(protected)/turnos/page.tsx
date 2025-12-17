
'use client';

import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/src/components/ProtectedRoute';
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
  ModalForm,
  ValidationMessage
} from '@/src/components/ui';
import { Clock, Car, User, Route, Plus, CheckCircle, AlertCircle, X, Printer } from 'lucide-react';
import { useNotifications } from '@/src/lib/notifications';
import { TimeService } from '@/src/lib/timeService';
import { safeFetch } from '@/src/lib/utils';
import { ValidacionResult } from '@/src/lib/validacionService';
import RutasMovilHoy, { RutasMovilHoyRef } from '@/src/components/RutasMovilHoy';
import TodasLasRutasHoy, { type TodasLasRutasHoyRef } from '@/src/components/TodasLasRutasHoy';
import ReciboImpresion from '@/src/components/ReciboImpresion';

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

interface RutaDelDia {
  id: number;
  hora: string;
  ruta: string;
  tipo: 'DESPACHO_A' | 'DESPACHO_B' | 'DESPACHO_C' | 'PROGRAMADO';
}

interface ProgramadoDelDia {
  id: number;
  hora: number;
  ruta: {
    id: number;
    nombre: string;
  };
  estado: 'PENDIENTE' | 'COMPLETADO';
  realizadoPor?: {
    id: number;
    movil: string;
  };
}

interface SugerenciaDespacho {
  tipo: 'DESPACHO_A' | 'DESPACHO_B' | 'DESPACHO_C';
  sugerido: boolean;
  razon?: string;
}

export default function TurnosPage() {
  return (
    <ProtectedRoute requiredPermission="tablaTurno">
      <TurnosPageContent />
    </ProtectedRoute>
  );
}

function TurnosPageContent() {
  const notifications = useNotifications();
  const rutasMovilHoyRef = useRef<RutasMovilHoyRef>(null);
  const todasLasRutasHoyRef = useRef<TodasLasRutasHoyRef>(null);
  const [automoviles, setAutomoviles] = useState<Automovil[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [conductoresPorAutomovil, setConductoresPorAutomovil] = useState<{[key: number]: Conductor[]}>({});
  const [automovilSeleccionado, setAutomovilSeleccionado] = useState<string>('');
  const [conductorSeleccionado, setConductorSeleccionado] = useState<string>('');
  const [automovilBusqueda, setAutomovilBusqueda] = useState<string>('');
  const [validacion, setValidacion] = useState<ValidacionResult | null>(null);
  const [validando, setValidando] = useState(false);
  const [rutasDelDia, setRutasDelDia] = useState<RutaDelDia[]>([]);
  const [programadosDelDia, setProgramadosDelDia] = useState<ProgramadoDelDia[]>([]);
  const [sugerencias, setSugerencias] = useState<SugerenciaDespacho[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModalAsignacion, setShowModalAsignacion] = useState(false);
  const [despachoSeleccionado, setDespachoSeleccionado] = useState<string>('');
  const [horaAsignacion, setHoraAsignacion] = useState<string>('');
  const [reciboData, setReciboData] = useState<any>(null);
  const [showRecibo, setShowRecibo] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (automovilSeleccionado) {
      // Buscar el automóvil por número de móvil para obtener el ID
      const automovilEncontrado = automoviles.find(a => a.movil === automovilSeleccionado);
      if (automovilEncontrado) {
        cargarConductoresPorAutomovil(automovilEncontrado.id);
      }
    }
  }, [automovilSeleccionado, automoviles]);

  useEffect(() => {
    if (automovilSeleccionado && conductorSeleccionado && 
        automovilSeleccionado.trim() !== '' && conductorSeleccionado.trim() !== '' &&
        !isNaN(parseInt(conductorSeleccionado))) {
      validarYCargarDatos();
    } else {
      setValidacion(null);
      setRutasDelDia([]);
      setProgramadosDelDia([]);
      setSugerencias([]);
    }
  }, [automovilSeleccionado, conductorSeleccionado]);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      
      // Cargar automóviles activos
      const automovilesResult = await safeFetch('/api/automoviles/activos');
      if (!automovilesResult.success) {
        throw new Error(`Error cargando automóviles: ${automovilesResult.error}`);
      }
      setAutomoviles(automovilesResult.data);

      // Cargar conductores activos
      const conductoresResult = await safeFetch('/api/conductores/activos');
      if (!conductoresResult.success) {
        throw new Error(`Error cargando conductores: ${conductoresResult.error}`);
      }
      setConductores(
        Array.isArray(conductoresResult.data)
          ? conductoresResult.data
          : (conductoresResult.data?.conductores ?? [])
      );
      
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      notifications.error('Error al cargar datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const cargarConductoresPorAutomovil = async (automovilId: number) => {
    try {
      const result = await safeFetch(`/api/automoviles/${automovilId}/conductores`);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      setConductoresPorAutomovil(prev => ({
        ...prev,
        [automovilId]: result.data
      }));
      
    } catch (error) {
      console.error('Error cargando conductores por automóvil:', error);
      notifications.error('Error al cargar conductores del automóvil');
    }
  };

  const validarYCargarDatos = async () => {
    if (!automovilSeleccionado || !conductorSeleccionado) return;

    try {
      setValidando(true);
      
      // Buscar el automóvil por número de móvil para obtener el ID
      const automovilEncontrado = automoviles.find(a => a.movil === automovilSeleccionado);
      if (!automovilEncontrado) {
        notifications.error('Automóvil no encontrado');
        return;
      }
      
      const movilId = automovilEncontrado.id;
      const conductorId = parseInt(conductorSeleccionado);
      
      if (isNaN(conductorId) || conductorId <= 0) {
        notifications.error('ID de conductor inválido');
        return;
      }
      
      // Validar licencia, planilla y documentos
      const validacionResult = await safeFetch('/api/validaciones', {
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
      
      if (!validacionResult.success) {
        throw new Error(validacionResult.error);
      }
      
      const validacion = validacionResult.data.validacion;
      setValidacion(validacion);
      
      // Si pasa las validaciones, cargar datos del día usando el número de móvil
      if (validacion.tienePlanilla && 
          validacion.tieneListaChequeo && 
          !validacion.licenciaConduccionVencida &&
          validacion.documentosVencidos.length === 0 &&
          !validacion.tieneSanciones &&
          !validacion.enRevision) {
        
        await cargarRutasDelDia(automovilSeleccionado); // Pasar el número de móvil
        await cargarProgramadosDelDia(automovilSeleccionado); // Pasar el número de móvil
        console.log()
        console.log(TimeService.getSimulationHeaders());
        console.log(TimeService);
      
      }
      
    } catch (error) {
      console.error('Error en validación:', error);
      notifications.error('Error al validar datos');
      setValidacion(null);
    } finally {
      setValidando(false);
    }
  };

  // Función para generar mensaje de validación
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

    // Si no tiene lista de chequeo, mostrar error
    if (!validacion.tieneListaChequeo) {
      return (
        <ValidationMessage
          type="error"
          title="Lista de Chequeo Pendiente"
          message="El móvil seleccionado no tiene la lista de chequeo completada para el día de hoy. No se pueden asignar turnos sin completar la lista de chequeo."
        />
      );
    }

    // Si la licencia de conducción está vencida, mostrar error
    if (validacion.licenciaConduccionVencida) {
      return (
        <ValidationMessage
          type="error"
          title="Licencia de Conducción Vencida"
          message="El conductor tiene la licencia de conducción vencida. No se pueden asignar turnos con licencia vencida."
        />
      );
    }

    // Si tiene documentos vencidos, mostrar error
    if (validacion.documentosVencidos.length > 0) {
      const detalles = validacion.documentosVencidos.map(doc => {
        const fechaVencimiento = doc.fechaVencimiento instanceof Date ? doc.fechaVencimiento : new Date(doc.fechaVencimiento);
        const fechaTexto = fechaVencimiento.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
        return `📄 ${doc.tipo}: Vencido el ${fechaTexto}`;
      });

      return (
        <ValidationMessage
          type="error"
          title="Documentos del Móvil Vencidos"
          message="El móvil seleccionado tiene los siguientes documentos vencidos. No se pueden asignar turnos con documentos vencidos:"
          details={detalles}
        />
      );
    }

    // Si tiene sanciones, mostrar error
    if (validacion.tieneSanciones) {
      const detalles: string[] = [];

      // Agregar detalles de sanciones del automóvil
      if (validacion.sancionesAutomovil.length > 0) {
        validacion.sancionesAutomovil.forEach(sancion => {
          const ini = sancion.fechaInicio instanceof Date ? sancion.fechaInicio : new Date(sancion.fechaInicio);
          const fin = sancion.fechaFin instanceof Date ? sancion.fechaFin : new Date(sancion.fechaFin);
          const iniTxt = isNaN(ini.getTime()) ? 'N/A' : ini.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
          const finTxt = isNaN(fin.getTime()) ? 'N/A' : fin.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
          detalles.push(`🚗 Automóvil: ${sancion.motivo} (del ${iniTxt} al ${finTxt})`);
        });
      }

      // Agregar detalles de sanciones del conductor
      if (validacion.sancionesConductor.length > 0) {
        validacion.sancionesConductor.forEach(sancion => {
          const ini = sancion.fechaInicio instanceof Date ? sancion.fechaInicio : new Date(sancion.fechaInicio);
          const fin = sancion.fechaFin instanceof Date ? sancion.fechaFin : new Date(sancion.fechaFin);
          const iniTxt = isNaN(ini.getTime()) ? 'N/A' : ini.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
          const finTxt = isNaN(fin.getTime()) ? 'N/A' : fin.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
          detalles.push(`👤 Conductor: ${sancion.motivo} (del ${iniTxt} al ${finTxt})`);
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

    // Si el automóvil está en revisión, mostrar error
    if (validacion.enRevision) {
      return (
        <ValidationMessage
          type="error"
          title="Automóvil en Revisión Técnica"
          message="El automóvil seleccionado está actualmente en revisión técnica y no puede ser despachado hasta que se complete la revisión."
        />
      );
    }

    // Si todas las validaciones pasan, mostrar mensaje de éxito
    return (
      <ValidationMessage
        type="info"
        title="Validaciones Completadas"
        message={`✅ Planilla: ${validacion.planilla ? 'Válida' : 'No encontrada'} | ✅ Lista de Chequeo: ${validacion.listaChequeo ? 'Completada' : 'No encontrada'} | ✅ Licencia: ${validacion.licenciaConduccionVencida ? 'Vencida' : 'Válida'} | ✅ Documentos: ${validacion.documentosVencidos.length > 0 ? `${validacion.documentosVencidos.length} vencidos` : 'Todos válidos'} | ✅ Sanciones: ${validacion.tieneSanciones ? 'Pendientes' : 'Sin sanciones'} | ✅ Revisión: ${validacion.enRevision ? 'En revisión' : 'Disponible'}`}
      />
    );
  };

  const cargarRutasDelDia = async (movilNumero: string) => {
    try {
      // Usar directamente el número de móvil, no el ID del automóvil
      const result = await safeFetch(`/api/turnos/movil/${movilNumero}/hoy`, {
        headers: TimeService.getSimulationHeaders()
      });
      
      if (result.success) {
        // Validar que result.data sea un array antes de usarlo
        const rutasData = Array.isArray(result.data) ? result.data : [];
        setRutasDelDia(rutasData);
        calcularSugerencias(rutasData);
      }
    } catch (error) {
      console.error('Error cargando rutas del día:', error);
    }
  };

  const cargarProgramadosDelDia = async (movilNumero: string) => {
    try {
      // Usar directamente el número de móvil, no el ID del automóvil
      const result = await safeFetch(`/api/programados/movil/${movilNumero}/hoy`, {
        headers: TimeService.getSimulationHeaders()
      });
      
      if (result.success) {
        // Validar que result.data.programados sea un array antes de usarlo
        const programadosData = Array.isArray(result.data.programados) ? result.data.programados : [];
        setProgramadosDelDia(programadosData);
      }
    } catch (error) {
      console.error('Error cargando programados del día:', error);
      setProgramadosDelDia([]); // Asegurar que siempre sea un array
    }
  };

  const calcularSugerencias = (rutas: RutaDelDia[]) => {
    // Validar que rutas sea un array
    if (!Array.isArray(rutas)) {
      console.warn('calcularSugerencias: rutas no es un array, usando array vacío');
      rutas = [];
    }

    // Validar que programadosDelDia sea un array
    const programadosArray = Array.isArray(programadosDelDia) ? programadosDelDia : [];

    const sugerenciasIniciales: SugerenciaDespacho[] = [
      { tipo: 'DESPACHO_A', sugerido: true },
      { tipo: 'DESPACHO_B', sugerido: true },
      { tipo: 'DESPACHO_C', sugerido: true }
    ];

    // REGLA 1: Si ya realizó Despacho C, eliminarlo
    const yaRealizoDespachoC = rutas.some(r => r.tipo === 'DESPACHO_C');
    if (yaRealizoDespachoC) {
      const index = sugerenciasIniciales.findIndex(s => s.tipo === 'DESPACHO_C');
      if (index !== -1) {
        sugerenciasIniciales[index].sugerido = false;
        sugerenciasIniciales[index].razon = 'Ya realizó Despacho C hoy';
      }
    }

    // REGLA 2: Si tiene programado Despacho C completado, eliminarlo
    const programadoDespachoC = programadosArray.find(p => 
      p.ruta.nombre.includes('DESPACHO_C') && p.estado === 'COMPLETADO'
    );
    if (programadoDespachoC) {
      const index = sugerenciasIniciales.findIndex(s => s.tipo === 'DESPACHO_C');
      if (index !== -1) {
        sugerenciasIniciales[index].sugerido = false;
        sugerenciasIniciales[index].razon = 'Programado Despacho C completado';
      }
    }

    // REGLAS 3 y 4: Último despacho entre A y B
    const despachosAB = rutas.filter(r => r.tipo === 'DESPACHO_A' || r.tipo === 'DESPACHO_B');
    if (despachosAB.length > 0) {
      const ultimoDespacho = despachosAB[despachosAB.length - 1];
      
      if (ultimoDespacho.tipo === 'DESPACHO_A') {
        const index = sugerenciasIniciales.findIndex(s => s.tipo === 'DESPACHO_A');
        if (index !== -1) {
          sugerenciasIniciales[index].sugerido = false;
          sugerenciasIniciales[index].razon = 'Último despacho fue A';
        }
      } else if (ultimoDespacho.tipo === 'DESPACHO_B') {
        const index = sugerenciasIniciales.findIndex(s => s.tipo === 'DESPACHO_B');
        if (index !== -1) {
          sugerenciasIniciales[index].sugerido = false;
          sugerenciasIniciales[index].razon = 'Último despacho fue B';
        }
      }
    }

    setSugerencias(sugerenciasIniciales);
  };

  const imprimirRecibo = (ruta: RutaDelDia) => {
    const automovilEncontrado = automoviles.find(a => a.movil === automovilSeleccionado);
    const conductorEncontrado = conductores.find(c => c.id.toString() === conductorSeleccionado);
    
    if (!automovilEncontrado || !conductorEncontrado) {
      notifications.error('Error: No se encontró información del móvil o conductor');
      return;
    }

    const fechaActual = new Date();
    const reciboInfo = {
      id: Date.now(), // ID temporal para el recibo
      fechaSalida: fechaActual.toLocaleDateString('es-ES'),
      horaSalida: ruta.hora,
      movil: automovilEncontrado.movil,
      placa: automovilEncontrado.placa,
      ruta: ruta.ruta,
      conductor: conductorEncontrado.nombre,
      despachadoPor: 'Sistema Turnos',
      registro: fechaActual.toLocaleString('es-ES'),
      qrData: `SOTRAM-${automovilEncontrado.movil}-${ruta.hora}-${fechaActual.getTime()}`
    };

    setReciboData(reciboInfo);
    setShowRecibo(true);
  };

  const imprimirReciboProgramado = (programado: ProgramadoDelDia) => {
    const automovilEncontrado = automoviles.find(a => a.movil === automovilSeleccionado);
    const conductorEncontrado = conductores.find(c => c.id.toString() === conductorSeleccionado);
    
    if (!automovilEncontrado || !conductorEncontrado) {
      notifications.error('Error: No se encontró información del móvil o conductor');
      return;
    }

    const fechaActual = new Date();
    const horaFormateada = `${String(programado.hora).padStart(2, '0')}:00`;
    
    const reciboInfo = {
      id: Date.now(), // ID temporal para el recibo
      fechaSalida: fechaActual.toLocaleDateString('es-ES'),
      horaSalida: horaFormateada,
      movil: automovilEncontrado.movil,
      placa: automovilEncontrado.placa,
      ruta: programado.ruta.nombre,
      conductor: conductorEncontrado.nombre,
      despachadoPor: 'Sistema Turnos',
      registro: fechaActual.toLocaleString('es-ES'),
      qrData: `SOTRAM-${automovilEncontrado.movil}-${horaFormateada}-${fechaActual.getTime()}`
    };

    setReciboData(reciboInfo);
    setShowRecibo(true);
  };

  const abrirModalAsignacion = (tipoDespacho: string) => {
    setDespachoSeleccionado(tipoDespacho);
    setHoraAsignacion('');
    setShowModalAsignacion(true);
  };

  const confirmarAsignacion = async () => {
    if (!horaAsignacion || !despachoSeleccionado) {
      notifications.error('Debe completar todos los campos');
      return;
    }

    try {
      // Buscar el automóvil por número de móvil para obtener el ID
      const automovilEncontrado = automoviles.find(a => a.movil === automovilSeleccionado);
      if (!automovilEncontrado) {
        notifications.error('Automóvil no encontrado');
        return;
      }

      // horaAsignacion log removido

      const result = await safeFetch('/api/turnos/asignar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...TimeService.getSimulationHeaders()
        },
        body: JSON.stringify({
          movilId: automovilEncontrado.id, // Usar el ID del automóvil
          conductorId: parseInt(conductorSeleccionado),
          despacho: despachoSeleccionado,
          hora: horaAsignacion
        })
      });

      if (result.success) {
        notifications.success('Despacho asignado correctamente');
        setShowModalAsignacion(false);
        // Recargar datos usando el número de móvil
        await cargarRutasDelDia(automovilSeleccionado);
        await cargarProgramadosDelDia(automovilSeleccionado);
        
        // Actualizar RutasMovilHoy si hay un móvil seleccionado
        if (automovilSeleccionado && rutasMovilHoyRef.current) {
          await rutasMovilHoyRef.current.actualizarRutas();
        }

        // Actualizar TodasLasRutasHoy (forzar bypass de caché)
        if (todasLasRutasHoyRef.current) {
          await todasLasRutasHoyRef.current.actualizarRutas(true);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error asignando despacho:', error);
      notifications.error('Error al asignar despacho');
    }
  };

  const limpiarFormulario = () => {
    setAutomovilSeleccionado('');
    setConductorSeleccionado('');
    setAutomovilBusqueda('');
    setValidacion(null);
    setRutasDelDia([]);
    setProgramadosDelDia([]);
    setSugerencias([]);
  };

  return (
    <div className="min-h-screen bg-white max-w-7xl mx-auto p-3 m-5 rounded-sm shadow-2xs">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Gestión de Turnos</h1>
          <TimeController/>
        </div>

      {/* Panel de Registro de Móvil y Conductor */}
      <Card className='shadow-lg border-none'>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Car className="h-5 w-5 text-blue-800" />
            Registro de Móvil y Conductor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Número de Móvil</label>
              <AutoComplete
                options={automoviles.map(a => ({
                  id: a.id,
                  label: a.movil,
                  subtitle: a.placa
                }))}
                value={automovilBusqueda}
                onValueChange={setAutomovilBusqueda}
                onSelect={(option) => {
                  setAutomovilSeleccionado(option.label); // Usar el número de móvil en lugar del ID
                  setAutomovilBusqueda(option.label);
                }}
                placeholder="Buscar móvil..."
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Conductor</label>
              <Select 
                value={conductorSeleccionado} 
                onValueChange={setConductorSeleccionado}
                disabled={!automovilSeleccionado || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // Buscar el automóvil por número de móvil para obtener el ID
                    const automovilEncontrado = automoviles.find(a => a.movil === automovilSeleccionado);
                    const automovilId = automovilEncontrado?.id;
                    if (!automovilId) return [];
                    return (conductoresPorAutomovil[automovilId] || []).map((conductor: Conductor) => (
                      <SelectItem key={conductor.id} value={conductor.id.toString()}>
                        {conductor.nombre} - {conductor.cedula}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={limpiarFormulario}
                variant="outline"
                className="w-full"
              >
                Limpiar
              </Button>
            </div>
          </div>

          {/* Validaciones */}
          {validando && (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Validando planillas y sanciones...</span>
            </div>
          )}

          {!validando && validacion && generarMensajeValidacion()}
        </CardContent>
      </Card>

      {/* Rutas del Día y Todas las Rutas - Layout de 2 columnas */}
      {automovilSeleccionado && conductorSeleccionado && validacion?.tienePlanilla && (
        <div className="grid grid-cols-1 gap-6">
          {/* Columna 1: Rutas del Móvil Seleccionado */}
          
            <RutasMovilHoy 
              ref={rutasMovilHoyRef}
              movilId={(() => {
                const automovilEncontrado = automoviles.find(a => a.movil === automovilSeleccionado);
                return automovilEncontrado?.id || 0;
              })()}
              movilNombre={automovilSeleccionado}
            />
          
          
      {/* Asignación de Despachos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Asignación de Despachos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              'DESPACHO_A',
              'DESPACHO_B',
              'DESPACHO_C',
              'DESPACHO D RUT4 PAMPA-CORZO',
              'DESPACHO D. RUT7 CORZO LORETO',
              'DESPACHO E RUT7 CORZO',
              'Despacho Puente piedra',
              'Despacho Colon vía Puente Piedra'
            ].map((tipo) => (
              <Card key={tipo} className="border-2 border-green-500 bg-green-50">
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold mb-4">{tipo.replace('_', ' ')}</h3>
                  <Button 
                    onClick={() => abrirModalAsignacion(tipo)}
                    className="w-full"
                    variant="default"
                  >
                    Asignar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
          
          {/* Columna 2: Todas las Rutas de Hoy */}
          <div>
            <Card className="h-fit">
              <CardContent className="p-6">
                <TodasLasRutasHoy ref={todasLasRutasHoyRef} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Todas las Rutas de Hoy - Solo cuando no hay móvil seleccionado */}
      {(!automovilSeleccionado || !conductorSeleccionado || !validacion?.tienePlanilla) && (
        <Card className="mb-6 border-none shadow-lg">
          <CardContent className="p-6">
            <TodasLasRutasHoy ref={todasLasRutasHoyRef} />
          </CardContent>
        </Card>
      )}



      {/* Modal de Confirmación de Asignación */}
      <ModalForm 
        isOpen={showModalAsignacion} 
        onClose={() => setShowModalAsignacion(false)}
        title="Confirmar Asignación"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Móvil:</span>
              <p>{automoviles.find(a => a.id.toString() === automovilSeleccionado)?.movil}</p>
            </div>
            <div>
              <span className="font-medium">Conductor:</span>
              <p>{conductores.find(c => c.id.toString() === conductorSeleccionado)?.nombre}</p>
            </div>
            <div>
              <span className="font-medium">Despacho:</span>
              <p>{despachoSeleccionado.replace('_', ' ')}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Hora (HH:MM)</label>
            <input
              type="time"
              value={horaAsignacion}
              onChange={(e) => setHoraAsignacion(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowModalAsignacion(false)}
            >
              Cancelar
            </Button>
            <Button onClick={confirmarAsignacion}>
              Confirmar Asignación
            </Button>
          </div>
        </div>
      </ModalForm>

      {/* Componente de Recibo de Impresión */}
      {showRecibo && reciboData && (
        <ReciboImpresion 
          data={reciboData}
          onPrint={() => {
            setShowRecibo(false);
            setReciboData(null);
          }}
        />
      )}
      </div>
    </div>
  );
}
