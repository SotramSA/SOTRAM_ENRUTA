'use client';

import { useState } from 'react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Alert, AlertDescription } from '@/src/components/ui/alert';
import { Separator } from '@/src/components/ui/separator';
import { Home } from 'lucide-react';
import Link from 'next/link';

// Nota: El componente Checkbox no existe en la UI, usaremos un input de tipo checkbox simple
const Checkbox = ({ id, checked, onChange, className = '' }: { id: string; checked: boolean; onChange: (checked: boolean) => void; className?: string }) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onChange(e.target.checked)}
    className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`}
  />
);

// Estructura de la lista de chequeo
const LISTA_CHEQUEO = {
  direccionales: {
    titulo: "Direccionales",
    items: [
      "Delanteras funcionamiento correcto",
      "Traseras funcionamiento correcto"
    ]
  },
  luces: {
    titulo: "Luces",
    items: [
      "Altas - Funcionamiento de bombillos, cubierta sin rotura, leds no fundidos",
      "Bajas - Funcionamiento de bombillos, cubierta sin rotura, leds no fundidos",
      "Reversa - Funcionamiento de bombillos, cubierta sin rotura, leds no fundidos",
      "Parqueo - Funcionamiento de bombillos, cubierta sin rotura, leds no fundidos"
    ]
  },
  limpiaparabrisas: {
    titulo: "Limpiaparabrisas",
    items: [
      "Derecho - Plumilla en buen estado",
      "Izquierdo - Plumilla en buen estado",
      "Trasero - Plumilla en buen estado"
    ]
  },
  frenos: {
    titulo: "Frenos",
    items: [
      "Principal - Verificar que frene cada día antes de iniciar la marcha",
      "Emergencia - Verificar que frene cada día antes de iniciar la marcha"
    ]
  },
  motor: {
    titulo: "Motor y Mecánica",
    items: [
      "Fugas motor - Que no presente goteo continuo",
      "Tensión correas - Buen estado y ajuste adecuado",
      "Tapas - Ajuste de tapas y tapas en buen estado",
      "Niveles de aceite de motor - Revisar nivel de motor",
      "Transmisión - Que no presente fugas ni ruidos anormales",
      "Dirección - Terminales en dirección en buen estado y ajuste adecuado",
      "Aditivos de radiador - No presente fugas y el refrigerante se encuentra a nivel",
      "Filtros húmedos y secos - Que no presenten fugas y ajuste adecuado"
    ]
  },
  bateria: {
    titulo: "Batería",
    items: [
      "Niveles de electrolito, ajuste de bornes y sulfatación"
    ]
  },
  llantas: {
    titulo: "Llantas",
    items: [
      "Delanteras - Verificar labrado, profundidad, desgaste, presión de aire y estado general",
      "Traseras - Verificar labrado, profundidad, desgaste, presión de aire y estado general",
      "Repuesto - Verificar labrado, profundidad, desgaste, presión de aire y estado general"
    ]
  },
  espejos: {
    titulo: "Espejos",
    items: [
      "Lateral derecho - Verificar estado, limpieza, sin rotura ni opacidad",
      "Lateral izquierdo - Verificar estado, limpieza, sin rotura ni opacidad",
      "Retrovisor - Verificar estado, limpieza, sin rotura ni opacidad"
    ]
  },
  pito: {
    titulo: "Pito",
    items: [
      "Pitar antes de iniciar la marcha"
    ]
  },
  fluidos: {
    titulo: "Niveles de Fluidos",
    items: [
      "Frenos - Revisar los niveles que sean los adecuados",
      "Aceite - Revisar los niveles que sean los adecuados",
      "Refrigerante - Revisar los niveles que sean los adecuados"
    ]
  },
  seguridad: {
    titulo: "Seguridad Interior",
    items: [
      "Apoya cabezas delanteros - Graduar ajustes",
      "Apoya cabezas traseros - Graduar ajustes",
      "Cinturones de seguridad delanteros - Verificar estado, que no presenten hilos sueltos y que estén ajustados",
      "Cinturones de seguridad traseros - Verificar estado, que no presenten hilos sueltos y que estén ajustados"
    ]
  },
  herramientas: {
    titulo: "Herramientas",
    items: [
      "Gato hidráulico",
      "Copa rueda",
      "Extintor",
      "Tacos",
      "Caja o estuche de herramientas",
      "Alicate",
      "Destornillador de pala",
      "Destornillador de estrella",
      "Llave de expansión",
      "Llave mixta de 10mm",
      "Llave mixta de 12mm",
      "Llave mixta de 13mm",
      "Linterna"
    ]
  },
  senales: {
    titulo: "Señales",
    items: [
      "Dos señales de carretera en material reflectivo y provistas de soportes para colocarlas en forma vertical o lámparas de luz amarillas con intervalos de destellos"
    ]
  },
  chaleco: {
    titulo: "Chaleco",
    items: [
      "Debe ser reflectivo"
    ]
  },
  botiquin: {
    titulo: "Botiquín",
    items: [
      "Verificar que todos los elementos se encuentren vigentes y limpios"
    ]
  }
};

export default function ListaChequeoPage() {
  const [numeroMovil, setNumeroMovil] = useState('');
  const [movilEncontrado, setMovilEncontrado] = useState(false);
  const [nombreInspector, setNombreInspector] = useState('');
  const [checkedItems, setCheckedItems] = useState<{[key: string]: boolean}>({});
  const [mensaje, setMensaje] = useState('');
  const [mensajeTipo, setMensajeTipo] = useState<'success' | 'error' | null>(null);
  const [loading, setLoading] = useState(false);
  const [yaRegistrado, setYaRegistrado] = useState(false);

  // Función para buscar el móvil
  const buscarMovil = async () => {
    if (!numeroMovil) {
      setMensaje('Por favor ingrese un número de móvil');
      setMensajeTipo('error');
      return;
    }
    setLoading(true);
    setMensaje('');
    setMensajeTipo(null);
    setYaRegistrado(false); // Reset state on new search

    try {
      const response = await fetch(`/api/automoviles/buscar/${numeroMovil}`);
      const data = await response.json();

      // Inicializar los checkboxes de la lista
      const checklistKeys = Object.values(LISTA_CHEQUEO).flatMap(cat => cat.items.map((item, index) => `${cat.titulo}-${index}`));

      if (response.ok && data.encontrado) {
        setMovilEncontrado(true);

        if (data.yaRegistrado) {
          setYaRegistrado(true);
          setNombreInspector(data.listaChequeo.nombre);
          // Marcar todos los items como chequeados
          const allChecked = checklistKeys.reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {} as { [key: string]: boolean });
          setCheckedItems(allChecked);
          setMensaje(`Inspección ya registrada hoy por: ${data.listaChequeo.nombre}.`);
          setMensajeTipo('success');
        } else {
          // Preparar para una nueva inspección
          setYaRegistrado(false);
          setNombreInspector('');
          const initialChecked = checklistKeys.reduce((acc, key) => {
            acc[key] = false;
            return acc;
          }, {} as { [key: string]: boolean });
          setCheckedItems(initialChecked);
        }
      } else {
        setMovilEncontrado(false);
        setMensaje(data.mensaje || 'No se encontró el móvil en la base de datos');
        setMensajeTipo('error');
      }
    } catch (error) {
      setMensaje('Error al buscar el móvil');
      setMensajeTipo('error');
    }
    setLoading(false);
  };

  // Función para manejar cambios en los checkboxes
  const handleCheckboxChange = (key: string, checked: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  // Función para enviar la lista de chequeo
  const enviarListaChequeo = async () => {
    if (!nombreInspector.trim()) {
      setMensaje('Por favor ingrese el nombre del inspector');
      return;
    }

    // Verificar que todos los items estén marcados
    const totalItems = Object.keys(checkedItems).length;
    const itemsMarcados = Object.values(checkedItems).filter(Boolean).length;

    if (itemsMarcados < totalItems) {
      setMensaje(`Faltan ${totalItems - itemsMarcados} elementos por revisar. Por favor complete toda la inspección antes de continuar.`);
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
        setMensaje('✅ Lista de chequeo completada exitosamente. El vehículo está listo para trabajar.');
        setMensajeTipo('success');
        // Resetear el formulario
        setNumeroMovil('');
        setMovilEncontrado(false);
        setNombreInspector('');
        setCheckedItems({});
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

  const [fechaActual] = useState(
    new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900">Lista de Chequeo Vehicular</h1>
          </div>
          <p className="text-gray-600">Complete la inspección pre-operacional del vehículo</p>
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

        {/* Tarjeta de búsqueda */}
        <Card className="mb-6 shadow-md">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="flex items-center text-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Búsqueda de Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="movil" className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Móvil
                </label>
                <Input
                  id="movil"
                  type="number"
                  placeholder="Ingrese el número de móvil"
                  value={numeroMovil}
                  onChange={(e) => setNumeroMovil(e.target.value)}
                  className="w-full"
                  onKeyDown={(e) => e.key === 'Enter' && buscarMovil()}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={buscarMovil}
                  disabled={loading || !numeroMovil.trim()}
                  className="h-10 w-full sm:w-auto"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Buscando...
                    </span>
                  ) : 'Buscar'}
                </Button>
              </div>
            </div>

            {mensaje && !movilEncontrado && (
              <div className={`mt-4 p-3 rounded-md ${mensajeTipo === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex">
                  <div className={`flex-shrink-0 ${mensajeTipo === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                    {mensajeTipo === 'success' ? (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414-1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className={`ml-3 ${mensajeTipo === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    <p className="text-sm font-medium">
                      {mensaje}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {movilEncontrado && (
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Inspección Pre-operacional - Móvil {numeroMovil}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Información del Inspector
              </h3>
              <div className="mt-2">
                <Input
                  id="inspector-name"
                  type="text"
                  value={nombreInspector}
                  onChange={(e) => setNombreInspector(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full"
                  disabled={yaRegistrado || loading}
                />
                <p className="mt-1 text-xs text-gray-500">Por favor ingrese su nombre para registrar la inspección</p>
              </div>
            </div>

            <div className="space-y-8">
              {Object.entries(LISTA_CHEQUEO).map(([key, categoria]) => {
                const totalItems = categoria.items.length;
                const itemsChecked = categoria.items.filter((_, index) => {
                  const checkboxKey = `${categoria.titulo}-${index}`;
                  return checkedItems[checkboxKey];
                }).length;
                const progress = totalItems > 0 ? Math.round((itemsChecked / totalItems) * 100) : 0;

                return (
                  <div key={key} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-medium text-gray-900 flex items-center">
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold mr-2">
                            {Object.keys(LISTA_CHEQUEO).indexOf(key) + 1}
                          </span>
                          {categoria.titulo}
                        </h3>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${progress === 100 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {itemsChecked} de {totalItems} completado
                        </span>
                      </div>
                      {totalItems > 0 && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {categoria.items.map((item, index) => {
                        const checkboxKey = `${categoria.titulo}-${index}`;
                        const isChecked = checkedItems[checkboxKey] || false;
                        return (
                          <div key={index} className={`p-3 hover:bg-gray-50 transition-colors ${isChecked ? 'bg-green-50' : ''}`}>
                            <div className="flex items-start">
                              <div className="flex items-center h-5 mt-0.5">
                                <input
                                  type="checkbox"
                                  id={checkboxKey}
                                  checked={isChecked}
                                  onChange={() => handleCheckboxChange(checkboxKey, !isChecked)}
                                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                  disabled={yaRegistrado || loading}
                                />
                              </div>
                              <label htmlFor={checkboxKey} className={`ml-3 text-sm ${isChecked ? 'text-gray-600 line-through' : 'text-gray-700'}`}>
                                {item}
                                {isChecked && (
                                  <span className="ml-2 inline-flex items-center text-green-600 text-xs">
                                    <svg className="h-3.5 w-3.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Verificado
                                  </span>
                                )}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <Button 
                  variant="outline"
                  onClick={() => { setMovilEncontrado(false); setMensaje(''); }}
                  className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700"
                >
                  Volver a búsqueda
                </Button>
                <Button
                  onClick={enviarListaChequeo}
                  disabled={loading || !nombreInspector.trim() || Object.values(checkedItems).some(v => !v) || yaRegistrado}
                  size="lg"
                  className="w-full sm:w-auto px-8 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                >
                  {loading ? 'Procesando...' : 'Completar Inspección'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
