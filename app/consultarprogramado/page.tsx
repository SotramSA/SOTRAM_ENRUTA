'use client';

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Search, CalendarDays, AlertCircle, CheckCircle, Printer, Home } from 'lucide-react';
import Link from 'next/link';

interface Programacion {
  id: number;
  fecha: string;
  ruta: string;
  hora: string;
}

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function ConsultarProgramadoPage() {
  const [movil, setMovil] = useState('');
  const [programaciones, setProgramaciones] = useState<Programacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const handleSearch = async () => {
    if (!movil) {
      setError('Por favor, ingrese un número de móvil.');
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    setProgramaciones([]);

    try {
      const response = await fetch(`/api/programacion/consultar/${movil}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || 'Error al buscar la programación.');
      }

      if (data.encontrado) {
        // console.log('Programaciones recibidas:', data.programaciones);
        // console.log('Rango recibido:', data.rango);
        setProgramaciones(data.programaciones);
      } else {
        setError('No se encontró el móvil ingresado.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    }
    setLoading(false);
  };

  const formatHoraColombia = (isoString: string) => {
    try {
      // Usar la zona horaria de Colombia directamente
      const fecha = new Date(isoString);
      const formatted = fecha.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Bogota',
      });
      return formatted.replace('a. m.', 'AM').replace('p. m.', 'PM');
    } catch (error) {
      console.error('Error formateando hora:', error);
      // Fallback simple sin restar horas
      const d = new Date(isoString);
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const suffix = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const hh = String(hours).padStart(2, '0');
      return `${hh}:${minutes} ${suffix}`;
    }
  };

  // Función para obtener el día de la semana
  const getDiaSemana = (fechaString: string): string => {
    try {
      // Crear fecha y usar zona horaria de Colombia
      const fecha = new Date(fechaString);
      
      // Obtener el día de la semana en zona horaria de Colombia
      const dia = fecha.toLocaleDateString('es-CO', {
        weekday: 'long',
        timeZone: 'America/Bogota'
      });
      
      // Mapear el nombre del día a nuestro array
      const diaIndex = diasSemana.findIndex(d => 
        d.toLowerCase() === dia.toLowerCase()
      );
      
      return diaIndex !== -1 ? diasSemana[diaIndex] : 'Desconocido';
    } catch (error) {
      console.error('Error al procesar fecha:', fechaString, error);
      return 'Desconocido';
    }
  };

  const programacionPorDia = programaciones.reduce((acc, prog) => {
    const dia = getDiaSemana(prog.fecha);
    if (!acc[dia]) {
      acc[dia] = [];
    }
    acc[dia].push(prog);
    return acc;
  }, {} as Record<string, Programacion[]>);

  // console.log('Programación agrupada por día:', programacionPorDia);

  const imprimirProgramacion = async () => {
    if (programaciones.length === 0) {
      return;
    }

    setImprimiendo(true);
    
    try {
      // Crear ventana de impresión
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Programación Semanal - Móvil ${movil}</title>
              <style>
                @media print {
                  @page {
                    size: A4;
                    margin: 1cm;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                  }
                }
                body {
                  margin: 0;
                  padding: 20px;
                  font-family: Arial, sans-serif;
                  font-size: 12px;
                  line-height: 1.4;
                }
                .header {
                  text-align: center;
                  margin-bottom: 20px;
                  border-bottom: 2px solid #000;
                  padding-bottom: 10px;
                }
                .company-name {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                .title {
                  font-size: 16px;
                  font-weight: bold;
                }
                .movil-info {
                  font-size: 14px;
                  margin: 10px 0;
                  text-align: center;
                }
                .day-section {
                  margin-bottom: 15px;
                  break-inside: avoid;
                }
                .day-title {
                  font-size: 14px;
                  font-weight: bold;
                  background-color: #f0f0f0;
                  padding: 8px;
                  border: 1px solid #ccc;
                  margin-bottom: 5px;
                }
                .programacion-item {
                  padding: 5px 10px;
                  border: 1px solid #ddd;
                  margin-bottom: 2px;
                  display: flex;
                  justify-content: space-between;
                }
                .ruta {
                  font-weight: bold;
                }
                .hora {
                  font-family: monospace;
                }
                .no-programacion {
                  padding: 5px 10px;
                  color: #666;
                  font-style: italic;
                }
                .footer {
                  text-align: center;
                  margin-top: 20px;
                  font-size: 10px;
                  color: #666;
                  border-top: 1px solid #ccc;
                  padding-top: 10px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="company-name">SOTRAM S.A</div>
                <div class="title">Programación Semanal</div>
                <div class="movil-info">Móvil: <strong>${movil}</strong></div>
              </div>
              
              <div class="content">
                ${['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(dia => `
                  <div class="day-section">
                    <div class="day-title">${dia}</div>
                    ${programacionPorDia[dia] && programacionPorDia[dia].length > 0 
                      ? programacionPorDia[dia].map(p => `
                          <div class="programacion-item">
                            <span class="ruta">${p.ruta}</span>
                            <span class="hora">${formatHoraColombia(p.hora)}</span>
                          </div>
                        `).join('')
                      : '<div class="no-programacion">Sin programación para este día</div>'
                    }
                  </div>
                `).join('')}
              </div>
              
              <div class="footer">
                EnRuta 2025 - Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}
              </div>
            </body>
          </html>
        `);
        
        printWindow.document.close();
        
        // Manejar impresión
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 100);
      }
    } catch (error) {
      console.error('Error al imprimir:', error);
    } finally {
      setImprimiendo(false);
    }
  };



	return (
		<div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="max-w-5xl mx-auto">
        {/* Encabezado */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Consultar Programación Semanal</h1>
              <p className="text-gray-600 mt-1">Consulta la programación de turnos para un móvil específico</p>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Volver al inicio</span>
              </Link>
              {programaciones.length > 0 && (
                <button
                  onClick={imprimirProgramacion}
                  disabled={imprimiendo}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                >
                  {imprimiendo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  <span>{imprimiendo ? 'Imprimiendo...' : 'Imprimir'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={movil}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMovil(e.target.value)}
                placeholder="Ingrese el número de móvil"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              <span>Buscar</span>
            </button>
          </div>
        </div>

          {loading && (
            <div className="text-center p-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-lg text-gray-600">Buscando programación...</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {searched && !loading && !error && (
            <div className="max-w-5xl mx-auto">
              {programaciones.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(dia => (
                    <div
                      key={dia}
                      className={`rounded-lg border p-4 ${
                        programacionPorDia[dia] && programacionPorDia[dia].length > 0
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-gray-600" />
                          {dia}
                        </h3>
                      </div>
                      {programacionPorDia[dia] && programacionPorDia[dia].length > 0 ? (
                        <ul className="space-y-2">
                          {programacionPorDia[dia].map(p => (
                            <li key={p.id} className="text-gray-700">
                              <p><span className="font-semibold">Ruta:</span> {p.ruta}</p>
                              <p><span className="font-semibold">Hora:</span> {formatHoraColombia(p.hora)}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">Sin programación para este día.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Información</AlertTitle>
                  <AlertDescription className="text-green-700">
                    No se encontró programación para este móvil en el rango de fechas consultado.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
