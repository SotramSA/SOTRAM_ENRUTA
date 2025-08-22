'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Alert, AlertDescription } from '@/src/components/ui/alert';
import { Separator } from '@/src/components/ui/separator';
import { Home, CheckCircle, Clock, AlertCircle, Car, User } from 'lucide-react';
import Link from 'next/link';

interface Automovil {
  id: number;
  movil: string;
  placa: string;
  activo: boolean;
}

interface ListaChequeo {
  id: number;
  fecha: string;
  nombre: string;
  movilId: number;
}

interface VehiculoConChequeo extends Automovil {
  listaChequeo?: ListaChequeo;
}

export default function ListaChequeoTodosPage() {
  const [vehiculos, setVehiculos] = useState<VehiculoConChequeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombreInspector, setNombreInspector] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [mensajeTipo, setMensajeTipo] = useState<'success' | 'error' | null>(null);
  const [fechaActual] = useState(new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));

  // Cargar todos los vehículos activos y sus listas de chequeo del día
  const cargarVehiculos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/listachequeo/todos');
      const data = await response.json();

      if (response.ok) {
        setVehiculos(data.vehiculos);
      } else {
        setMensaje(data.error || 'Error al cargar los vehículos');
        setMensajeTipo('error');
      }
    } catch (error) {
      setMensaje('Error al cargar los vehículos');
      setMensajeTipo('error');
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarVehiculos();
  }, []);

  // Función para registrar lista de chequeo para un vehículo específico
  const registrarChequeo = async (numeroMovil: string) => {
    if (!nombreInspector.trim()) {
      setMensaje('Por favor ingrese el nombre del inspector');
      setMensajeTipo('error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/listachequeo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numeroMovil,
          nombreInspector
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje(`✅ Lista de chequeo completada para el móvil ${numeroMovil}`);
        setMensajeTipo('success');
        // Recargar la lista de vehículos
        setTimeout(() => {
          cargarVehiculos();
          setMensaje('');
          setMensajeTipo(null);
        }, 2000);
      } else {
        setMensaje(data.error || 'Error al guardar la lista de chequeo');
        setMensajeTipo('error');
      }
    } catch (error) {
      setMensaje('Error al enviar la lista de chequeo');
      setMensajeTipo('error');
    }
    setLoading(false);
  };

  // Calcular estadísticas
  const totalVehiculos = vehiculos.length;
  const vehiculosChequeados = vehiculos.filter(v => v.listaChequeo).length;
  const vehiculosPendientes = totalVehiculos - vehiculosChequeados;
  const porcentajeCompletado = totalVehiculos > 0 ? Math.round((vehiculosChequeados / totalVehiculos) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900">Lista de Chequeo - Todos los Vehículos</h1>
          </div>
          <p className="text-gray-600">Gestión de inspecciones pre-operacionales para toda la flota</p>
          <div className="mt-2 text-sm text-gray-500">{fechaActual}</div>
          
          {/* Botón Volver al inicio */}
          <div className="mt-4">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Volver al inicio</span>
            </Link>
          </div>
        </div>

        {/* Estadísticas */}
        <Card className="mb-6 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Resumen del Día
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalVehiculos}</div>
                <div className="text-sm text-gray-600">Total Vehículos</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{vehiculosChequeados}</div>
                <div className="text-sm text-gray-600">Chequeados</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{vehiculosPendientes}</div>
                <div className="text-sm text-gray-600">Pendientes</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{porcentajeCompletado}%</div>
                <div className="text-sm text-gray-600">Completado</div>
              </div>
            </div>
            
            {/* Barra de progreso */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progreso general</span>
                <span>{vehiculosChequeados} de {totalVehiculos}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeCompletado}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del Inspector */}
        <Card className="mb-6 shadow-md">
          <CardHeader className="bg-gray-50 border-b border-gray-100">
            <CardTitle className="flex items-center text-gray-800">
              <User className="h-5 w-5 mr-2" />
              Información del Inspector
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="inspector-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Inspector
                </label>
                <Input
                  id="inspector-name"
                  type="text"
                  value={nombreInspector}
                  onChange={(e) => setNombreInspector(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500">Este nombre se registrará para todas las inspecciones que realice</p>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={cargarVehiculos}
                  disabled={loading}
                  className="h-10 w-full sm:w-auto"
                >
                  {loading ? 'Cargando...' : 'Actualizar Lista'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mensajes */}
        {mensaje && (
          <Alert className={`mb-6 ${mensajeTipo === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex">
              <div className={`flex-shrink-0 ${mensajeTipo === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {mensajeTipo === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              </div>
              <div className={`ml-3 ${mensajeTipo === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                <AlertDescription>{mensaje}</AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {/* Lista de vehículos */}
        {loading ? (
          <Card className="shadow-md">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando vehículos...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehiculos.map((vehiculo) => {
              const yaChequeado = !!vehiculo.listaChequeo;
              const horaChequeo = vehiculo.listaChequeo 
                ? new Date(vehiculo.listaChequeo.fecha).toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                : null;

              return (
                <Card key={vehiculo.id} className={`shadow-md transition-all duration-200 hover:shadow-lg ${
                  yaChequeado ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}>
                  <CardHeader className={`pb-3 ${yaChequeado ? 'bg-green-100' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Car className={`h-5 w-5 mr-2 ${yaChequeado ? 'text-green-600' : 'text-gray-600'}`} />
                        <CardTitle className={`text-lg ${yaChequeado ? 'text-green-800' : 'text-gray-800'}`}>
                          Móvil {vehiculo.movil}
                        </CardTitle>
                      </div>
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        yaChequeado 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {yaChequeado ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completado
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Pendiente
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Placa: {vehiculo.placa}</p>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {yaChequeado ? (
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-green-700">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <span>Inspección completada</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div><strong>Inspector:</strong> {vehiculo.listaChequeo?.nombre}</div>
                          <div><strong>Hora:</strong> {horaChequeo}</div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-green-300 text-green-700 hover:bg-green-100"
                          disabled
                        >
                          Ya Completado
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-yellow-700">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>Pendiente de inspección</span>
                        </div>
                        <Button 
                          onClick={() => registrarChequeo(vehiculo.movil)}
                          disabled={loading || !nombreInspector.trim()}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {loading ? 'Procesando...' : 'Completar Chequeo'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Mensaje cuando no hay vehículos */}
        {!loading && vehiculos.length === 0 && (
          <Card className="shadow-md">
            <CardContent className="p-8">
              <div className="text-center">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay vehículos disponibles</h3>
                <p className="text-gray-600">No se encontraron vehículos activos en la base de datos.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
