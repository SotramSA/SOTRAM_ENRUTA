'use client';

import { useState, useEffect } from 'react';
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
  AutoComplete
} from '@/src/components/ui';
import { 
  FileText, 
  Car, 
  User, 
  Route, 
  Clock, 
  Printer,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useNotifications } from '@/src/lib/notifications';

interface Automovil {
  id: number;
  movil: string;
  placa: string;
  activo: boolean;
}

interface Conductor {
  id: number;
  nombre: string;
  activo: boolean;
}

interface Ruta {
  id: number;
  nombre: string;
  activo: boolean;
}

interface ReciboData {
  automovilId: number;
  conductorId: number;
  rutaId: number;
  horaSalida: string;
}

export default function PlanilleroPage() {
  return (
    <ProtectedRoute requiredPermission="tablaTurno">
      <PlanilleroPageContent />
    </ProtectedRoute>
  );
}

function PlanilleroPageContent() {
  const notifications = useNotifications();
  
  // Estados para los formularios
  const [automoviles, setAutomoviles] = useState<Automovil[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [datosError, setDatosError] = useState<string | null>(null);
  
  // Estados para la selección
  const [automovilSeleccionado, setAutomovilSeleccionado] = useState<string>('');
  const [conductorSeleccionado, setConductorSeleccionado] = useState<string>('');
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>('');
  const [horaSalida, setHoraSalida] = useState<string>('');
  
  // Estados para los IDs seleccionados
  const [automovilIdSeleccionado, setAutomovilIdSeleccionado] = useState<number | null>(null);
  const [conductorIdSeleccionado, setConductorIdSeleccionado] = useState<number | null>(null);
  
  // Estados de control
  const [loading, setLoading] = useState(false);
  const [generandoRecibo, setGenerandoRecibo] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      setDatosError(null);
      
      const errors = [];
      
      // Cargar automóviles activos
      try {
        console.log('🔄 Cargando automóviles...');
        const automovilesResponse = await fetch('/api/automoviles?activo=true&limit=1000');
        console.log('📡 Response automóviles status:', automovilesResponse.status);
        
        if (automovilesResponse.ok) {
          const automovilesData = await automovilesResponse.json();
          console.log('📋 Automóviles raw data:', automovilesData);
          
          // El API devuelve { automoviles: [...], total, ... }, necesitamos el array automoviles
          const automovilesArray = automovilesData.automoviles || automovilesData;
          const automovilesActivos = Array.isArray(automovilesArray) ? automovilesArray : [];
          
          console.log('🚗 Automóviles encontrados:', automovilesActivos.length, automovilesActivos);
          setAutomoviles(automovilesActivos);
        } else {
          console.error('❌ Error response automóviles:', automovilesResponse.status);
          errors.push('automóviles');
        }
      } catch (err) {
        console.error('❌ Error cargando automóviles:', err);
        errors.push('automóviles');
      }
      
      // Cargar conductores activos
      try {
        console.log('🔄 Cargando conductores...');
        const conductoresResponse = await fetch('/api/conductores?limit=1000');
        console.log('📡 Response conductores status:', conductoresResponse.status);
        
        if (conductoresResponse.ok) {
          const conductoresData = await conductoresResponse.json();
          console.log('📋 Conductores raw data:', conductoresData);
          
          // El API devuelve { conductores: [...], total, ... }, necesitamos el array conductores
          const conductoresArray = conductoresData.conductores || conductoresData;
          const conductoresEncontrados = Array.isArray(conductoresArray) ? conductoresArray : [];
          
          console.log('👥 Conductores encontrados:', conductoresEncontrados.length, conductoresEncontrados);
          setConductores(conductoresEncontrados);
        } else {
          console.error('❌ Error response conductores:', conductoresResponse.status);
          errors.push('conductores');
        }
      } catch (err) {
        console.error('❌ Error cargando conductores:', err);
        errors.push('conductores');
      }
      
      // Cargar rutas activas
      try {
        const rutasResponse = await fetch('/api/rutas/activas');
        if (rutasResponse.ok) {
          const rutasData = await rutasResponse.json();
          const rutasArray = Array.isArray(rutasData) ? rutasData : [];
          setRutas(rutasArray);
        } else {
          errors.push('rutas');
        }
      } catch (err) {
        errors.push('rutas');
        console.error('Error cargando rutas:', err);
      }
      
      if (errors.length > 0) {
        const errorMsg = `Error al cargar: ${errors.join(', ')}`;
        setDatosError(errorMsg);
        notifications.error(errorMsg);
      }
      
    } catch (error) {
      console.error('Error general cargando datos:', error);
      setDatosError('Error general al cargar los datos del sistema');
      notifications.error('Error al cargar los datos del sistema');
    } finally {
      setLoading(false);
    }
  };

  const validarFormulario = (): boolean => {
    if (!automovilIdSeleccionado) {
      notifications.error('Selecciona un automóvil');
      return false;
    }
    if (!conductorIdSeleccionado) {
      notifications.error('Selecciona un conductor');
      return false;
    }
    if (!rutaSeleccionada || isNaN(parseInt(rutaSeleccionada))) {
      notifications.error('Selecciona una ruta');
      return false;
    }
    if (!horaSalida) {
      notifications.error('Ingresa la hora de salida');
      return false;
    }
    return true;
  };

  const generarRecibo = async () => {
    if (!validarFormulario()) return;

    try {
      setGenerandoRecibo(true);
      
      const reciboData: ReciboData = {
        automovilId: automovilIdSeleccionado!,
        conductorId: conductorIdSeleccionado!,
        rutaId: parseInt(rutaSeleccionada),
        horaSalida
      };

      const response = await fetch('/api/planillero/generar-recibo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reciboData)
      });

      if (response.ok) {
        const recibo = await response.json();
        
        // Crear el HTML del recibo usando la misma función que en turnos
        const createReceiptHTML = (reciboData: any, includeConductor: boolean) => {
          const conductorRow = includeConductor ? `
            <div class="info-row">
              <span class="label">Conductor:</span>
              <span class="value">${reciboData.conductor}</span>
            </div>` : '';
          
          return `<!DOCTYPE html>
        <html>
        <head>
          <title>Recibo</title>
          <style>
            @media print { 
              size: 80mm auto; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 8px; 
              font-family: Arial, sans-serif; 
              font-size: 14px; 
              line-height: 1.3; 
              width: 80mm; 
              max-width: 80mm; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 8px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              gap: 8px; 
            }
            .logo { 
              width: 50px; 
              height: 50px; 
              display: block; 
            }
            .company-name { 
              font-size: 16px; 
              font-weight: bold; 
            }
            .title { 
              font-size: 15px; 
              font-weight: bold; 
              text-align: center; 
              margin: 8px 0; 
              border-bottom: 2px solid #000; 
              padding-bottom: 4px; 
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 4px 0; 
              padding: 2px; 
            }
            .label { 
              font-weight: bold; 
              font-size: 13px; 
            }
            .value { 
              text-align: right; 
              font-size: 13px; 
            }
            .hora-salida { 
              font-size: 20px; 
              font-weight: bold; 
              text-align: center; 
              margin: 8px 0; 
              padding: 6px; 
            }
            .ruta-destacada { 
              font-size: 28px; 
              font-weight: bold; 
              text-align: center; 
              margin: 8px 0; 
              padding: 8px; 
            }
            .footer { 
              text-align: center; 
              margin-top: 8px; 
              font-size: 11px; 
              border-top: 1px solid #000; 
              padding-top: 4px; 
            }
            .manual-badge {
              background-color: #f59e0b;
              color: white;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
              text-align: center;
              margin: 4px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo png.png" alt="Logo" class="logo" />
            <div class="company-name">SOTRAM S.A</div>
          </div>
          <div class="manual-badge">RECIBO MANUAL</div>
          <div class="title">PLANILLA DE VIAJE No. ${reciboData.id}</div>
          <div class="hora-salida">Hora de salida: ${reciboData.horaSalida}</div>
          <div class="ruta-destacada">${reciboData.ruta}</div>
          <div class="info-row"><span class="label">Fecha:</span><span class="value">${reciboData.fechaSalida}</span></div>
          <div class="info-row"><span class="label">Móvil:</span><span class="value">${reciboData.movil}</span></div>
          <div class="info-row"><span class="label">Placa:</span><span class="value">${reciboData.placa}</span></div>${conductorRow}
          <div class="info-row"><span class="label">Despachado por:</span><span class="value">${reciboData.despachadoPor}</span></div>
          <div class="info-row"><span class="label">Registro:</span><span class="value">${reciboData.registro}</span></div>
          <div class="footer">EnRuta 2025 - Planillero Manual</div>
        </body>
        </html>`;
        };

        // Abrir ventana de impresión
        const printWindow = window.open('', '_blank', 'width=1,height=1,left=-1000,top=-1000,scrollbars=no,resizable=no,toolbar=no,location=no,directories=no,status=no,menubar=no');
        if (printWindow) {
          const htmlContent = createReceiptHTML(recibo, true);
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        }

        notifications.success('Recibo generado e impreso exitosamente');
        
        // Limpiar formulario
        limpiarFormulario();
        
      } else {
        throw new Error('Error al generar el recibo');
      }
      
    } catch (error) {
      console.error('Error generando recibo:', error);
      notifications.error('Error al generar el recibo');
    } finally {
      setGenerandoRecibo(false);
    }
  };

  const limpiarFormulario = () => {
    setAutomovilSeleccionado('');
    setConductorSeleccionado('');
    setRutaSeleccionada('');
    setHoraSalida('');
    setAutomovilIdSeleccionado(null);
    setConductorIdSeleccionado(null);
  };

  // Obtener hora actual como valor por defecto
  const obtenerHoraActual = () => {
    const ahora = new Date();
    return ahora.toTimeString().slice(0, 5); // HH:MM
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando datos del sistema...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Planillero Manual</h1>
          </div>
          <p className="text-gray-600">
            Sistema de respaldo para generar recibos manuales cuando el sistema principal falle
          </p>
        </div>

        {/* Alerta de error si hay problemas cargando datos */}
        {datosError && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-1">Error cargando datos</h3>
                  <p className="text-red-700 text-sm mb-3">{datosError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cargarDatosIniciales}
                    disabled={loading}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Reintentar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerta informativa */}
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-800 mb-1">Sistema de Respaldo</h3>
                <p className="text-orange-700 text-sm">
                  Este módulo está diseñado para ser usado únicamente cuando el sistema de turnos principal no esté funcionando. 
                  Los recibos generados aquí tendrán la marca "RECIBO MANUAL" para identificarlos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Generar Recibo Manual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selección de Automóvil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Car className="h-4 w-4 inline mr-1" />
                Automóvil
              </label>
              <AutoComplete
                value={automovilSeleccionado}
                onValueChange={setAutomovilSeleccionado}
                onSelect={(option) => {
                  setAutomovilSeleccionado(option.label);
                  setAutomovilIdSeleccionado(option.id);
                }}
                placeholder="Buscar automóvil..."
                options={automoviles?.map(auto => ({
                  id: auto.id,
                  label: `${auto.movil} - ${auto.placa}`
                })) || []}
              />
            </div>

            {/* Selección de Conductor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-1" />
                Conductor
              </label>
              <AutoComplete
                value={conductorSeleccionado}
                onValueChange={setConductorSeleccionado}
                onSelect={(option) => {
                  setConductorSeleccionado(option.label);
                  setConductorIdSeleccionado(option.id);
                }}
                placeholder="Buscar conductor..."
                options={conductores?.map(conductor => ({
                  id: conductor.id,
                  label: conductor.nombre
                })) || []}
              />
            </div>

            {/* Selección de Ruta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Route className="h-4 w-4 inline mr-1" />
                Ruta/Despacho
              </label>
              <Select value={rutaSeleccionada} onValueChange={setRutaSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una ruta" />
                </SelectTrigger>
                <SelectContent>
                  {rutas?.map(ruta => (
                    <SelectItem key={ruta.id} value={ruta.id.toString()}>
                      {ruta.nombre}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>

            {/* Hora de Salida */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Hora de Salida
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={horaSalida}
                  onChange={(e) => setHoraSalida(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setHoraSalida(obtenerHoraActual())}
                  className="whitespace-nowrap"
                >
                  Hora Actual
                </Button>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={generarRecibo}
                disabled={generandoRecibo}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {generandoRecibo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Generar e Imprimir Recibo
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={limpiarFormulario}
                disabled={generandoRecibo}
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4" />
              Información del Recibo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• El recibo se imprimirá directamente sin mostrar diálogo de impresión</p>
              <p>• Incluirá la marca "RECIBO MANUAL" para identificación</p>
              <p>• Los datos se tomarán directamente de la base de datos</p>
              <p>• El número de planilla será generado automáticamente</p>
              <p>• El despachador será el usuario actual conectado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
