'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Automovil {
  id: number;
  movil: string;
  placa: string;
  enRevision: boolean;
  revisionPreventiva: boolean;
}

interface Inspeccion {
  id: number;
  automovilId: number;
  fechaCreacion: string;
  nombreIngeniero: string;
  cedulaIngeniero: string;
  firmaDigital?: string;
  observaciones?: string;
  aprobada: boolean;
  automovil: {
    movil: string;
    placa: string;
  };
}

export default function InspeccionesPage() {
  const [automoviles, setAutomoviles] = useState<Automovil[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [selectedAutomovilId, setSelectedAutomovilId] = useState<string>('');
  const [nombreIngeniero, setNombreIngeniero] = useState('');
  const [cedulaIngeniero, setCedulaIngeniero] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [aprobada, setAprobada] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showInspecciones, setShowInspecciones] = useState(false);
  
  // Estados para filtros
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroInspector, setFiltroInspector] = useState('');
  const [filtroVehiculo, setFiltroVehiculo] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [firmaDigital, setFirmaDigital] = useState<string>('');

  // Cargar automóviles al montar el componente
  useEffect(() => {
    cargarAutomoviles();
    cargarInspecciones();
  }, []);

  const cargarAutomoviles = async () => {
    try {
      const response = await fetch('/api/automoviles?limit=1000&activo=true');
      if (response.ok) {
        const data = await response.json();
        setAutomoviles(data.automoviles);
      }
    } catch (error) {
      console.error('Error al cargar automóviles:', error);
    }
  };

  const cargarInspecciones = async () => {
    try {
      const response = await fetch('/api/inspecciones');
      if (response.ok) {
        const data = await response.json();
        setInspecciones(data);
      }
    } catch (error) {
      console.error('Error al cargar inspecciones:', error);
    }
  };

  // Funciones para el canvas de firma
  const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const pos = getMousePos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const pos = getMousePos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Guardar la firma como base64
    const dataURL = canvas.toDataURL('image/png');
    setFirmaDigital(dataURL);
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaDigital('');
  };

  const iniciarRevision = async (automovilId: number) => {
    try {
      const response = await fetch('/api/automoviles/estado-revision', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          automovilId,
          enRevision: true,
          revisionPreventiva: false
        }),
      });

      if (response.ok) {
        alert('Vehículo puesto en revisión correctamente');
        cargarAutomoviles();
      } else {
        alert('Error al poner el vehículo en revisión');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al poner el vehículo en revisión');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAutomovilId || !nombreIngeniero || !cedulaIngeniero) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    if (!firmaDigital) {
      alert('Por favor agregue su firma digital');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/inspecciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          automovilId: parseInt(selectedAutomovilId),
          nombreIngeniero,
          cedulaIngeniero,
          firmaDigital,
          observaciones,
          aprobada
        }),
      });

      if (response.ok) {
        alert('Inspección registrada correctamente');
        // Limpiar formulario
        setSelectedAutomovilId('');
        setNombreIngeniero('');
        setCedulaIngeniero('');
        setObservaciones('');
        setAprobada(false);
        limpiarFirma();
        cargarAutomoviles();
        cargarInspecciones();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error al registrar inspección:', error);
      alert('Error al registrar la inspección');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setFiltroFecha('');
    setFiltroInspector('');
    setFiltroVehiculo('');
  };

  // Filtrar inspecciones basado en los filtros aplicados
  const inspeccionesFiltradas = inspecciones.filter((inspeccion) => {
    const fechaInspeccion = new Date(inspeccion.fechaCreacion).toLocaleDateString();
    const nombreInspector = inspeccion.nombreIngeniero.toLowerCase();
    const vehiculo = `${inspeccion.automovil.movil} - ${inspeccion.automovil.placa}`.toLowerCase();

    const cumpleFiltroFecha = !filtroFecha || fechaInspeccion.includes(filtroFecha);
    const cumpleFiltroInspector = !filtroInspector || nombreInspector.includes(filtroInspector.toLowerCase());
    const cumpleFiltroVehiculo = !filtroVehiculo || vehiculo.includes(filtroVehiculo.toLowerCase());

    return cumpleFiltroFecha && cumpleFiltroInspector && cumpleFiltroVehiculo;
  });

  return (
    <div className="container bg-white mx-auto p-6 space-y-6  min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inspecciones Técnicas</h1>
        <Button 
          onClick={() => setShowInspecciones(!showInspecciones)}
          variant="outline"
        >
          {showInspecciones ? 'Ocultar Historial' : 'Ver Historial'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de Nueva Inspección */}
        <Card>
          <CardHeader>
            <CardTitle>Nueva Inspección Técnica</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Vehículo *
                </label>
                <select
                  value={selectedAutomovilId}
                  onChange={(e) => setSelectedAutomovilId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Seleccione un vehículo</option>
                  {automoviles.map((auto) => (
                    <option key={auto.id} value={auto.id}>
                      {auto.movil} - {auto.placa}
                      {auto.enRevision && ' (En Revisión)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre del Ingeniero/Inspector *
                </label>
                <Input
                  type="text"
                  value={nombreIngeniero}
                  onChange={(e) => setNombreIngeniero(e.target.value)}
                  placeholder="Nombre completo del ingeniero"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Cédula del Ingeniero/Inspector *
                </label>
                <Input
                  type="text"
                  value={cedulaIngeniero}
                  onChange={(e) => setCedulaIngeniero(e.target.value)}
                  placeholder="Número de cédula"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Observaciones
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Observaciones de la inspección"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="aprobada"
                  checked={aprobada}
                  onChange={(e) => setAprobada(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="aprobada" className="text-sm font-medium">
                  Inspección Aprobada
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Firma Digital *
                </label>
                <div className="border border-gray-300 rounded-md p-2 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="border border-gray-200 cursor-crosshair bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ 
                      touchAction: 'none',
                      width: '100%',
                      height: '150px',
                      maxWidth: '400px',
                      backgroundColor: 'white'
                    }}
                  />
                  <div className="mt-2 flex justify-between">
                    <Button
                      type="button"
                      onClick={limpiarFirma}
                      variant="outline"
                      size="sm"
                    >
                      Limpiar Firma
                    </Button>
                    <span className="text-xs text-gray-500">
                      Dibuje su firma en el área de arriba
                    </span>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Registrando...' : 'Registrar Inspección'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Vehículos */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Vehículos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {automoviles.map((auto) => (
                <div
                  key={auto.id}
                  className={`p-3 border rounded-md ${
                    auto.enRevision
                      ? 'border-red-300 bg-red-50'
                      : auto.revisionPreventiva
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {auto.movil} - {auto.placa}
                      </p>
                      <p className="text-sm text-gray-600">
                        {auto.enRevision
                          ? 'En Revisión'
                          : auto.revisionPreventiva
                          ? 'Revisión Aprobada'
                          : 'Sin Revisión Reciente'}
                      </p>
                    </div>
                    {!auto.enRevision && (
                      <Button
                        onClick={() => iniciarRevision(auto.id)}
                        size="sm"
                        variant="outline"
                      >
                        Iniciar Revisión
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Inspecciones */}
      {showInspecciones && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Inspecciones</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Filtrar por Fecha
                </label>
                <Input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Filtrar por Inspector
                </label>
                <Input
                  type="text"
                  placeholder="Nombre del inspector"
                  value={filtroInspector}
                  onChange={(e) => setFiltroInspector(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Filtrar por Vehículo
                </label>
                <Input
                  type="text"
                  placeholder="Móvil o placa"
                  value={filtroVehiculo}
                  onChange={(e) => setFiltroVehiculo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={limpiarFiltros}
                  variant="outline"
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left">Fecha</th>
                    <th className="border border-gray-300 p-2 text-left">Vehículo</th>
                    <th className="border border-gray-300 p-2 text-left">Ingeniero</th>
                    <th className="border border-gray-300 p-2 text-left">Estado</th>
                    <th className="border border-gray-300 p-2 text-left">Observaciones</th>
                    <th className="border border-gray-300 p-2 text-left">Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {inspeccionesFiltradas.map((inspeccion) => (
                    <tr key={inspeccion.id}>
                      <td className="border border-gray-300 p-2">
                        {new Date(inspeccion.fechaCreacion).toLocaleDateString()}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {inspeccion.automovil.movil} - {inspeccion.automovil.placa}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {inspeccion.nombreIngeniero}
                        <br />
                        <span className="text-xs text-gray-500">
                          CC: {inspeccion.cedulaIngeniero}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            inspeccion.aprobada
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {inspeccion.aprobada ? 'Aprobada' : 'No Aprobada'}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-2">
                        {inspeccion.observaciones || 'Sin observaciones'}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {inspeccion.firmaDigital && (
                          <img
                            src={inspeccion.firmaDigital}
                            alt="Firma"
                            className="max-w-20 max-h-10 border"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}