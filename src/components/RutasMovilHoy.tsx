'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Car, Clock, User, AlertCircle, CheckCircle, XCircle, PlayCircle, Printer, Trash2, RotateCcw } from 'lucide-react';
import { TimeService } from '@/src/lib/timeService';
import { ModalConfirmarReciboProgramado } from '@/src/components/ui';

interface Ruta {
  id: number;
  horaSalida: string | number;
  ruta: { id: number; nombre: string } | null;
  movil: { id: number; movil: string };
  conductor: { id: number; nombre: string };
  estado: string;
  tipo?: 'programado' | 'turno';
}

interface RutasMovilHoyProps {
  movilId: number;
  movilNombre: string;
}

export interface RutasMovilHoyRef {
  actualizarRutas: () => Promise<void>;
}

export default forwardRef<RutasMovilHoyRef, RutasMovilHoyProps>(function RutasMovilHoy({ movilId, movilNombre }, ref) {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el modal de confirmar recibo programado
  const [showModalReciboProgramado, setShowModalReciboProgramado] = useState(false);
  const [programadoParaRecibo, setProgramadoParaRecibo] = useState<any>(null);

  const fetchRutas = async () => {
    try {
      
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/movil/${movilId}/rutas-hoy`, {
        headers: {
          ...TimeService.getSimulationHeaders()
        }
      });

      

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 RutasMovilHoy: Error response:', errorText);
        throw new Error(`Error al obtener las rutas: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      setRutas(data.data || []);
      
    } catch (err) {
      console.error('🔍 RutasMovilHoy: Error en fetch:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Funciones para el modal de recibo programado
  const abrirModalReciboProgramado = (ruta: Ruta) => {
    setProgramadoParaRecibo({
      id: ruta.id,
      movil: { id: ruta.movil.id, movil: ruta.movil.movil },
      horaSalida: ruta.horaSalida
    });
    setShowModalReciboProgramado(true);
  };

  const cerrarModalReciboProgramado = () => {
    setShowModalReciboProgramado(false);
    setProgramadoParaRecibo(null);
  };

  const confirmarReciboProgramado = async (datos: {
    movilNumero: string;
    conductorId: number;
    conductorNombre: string;
    esDiferente: boolean;
    movilOriginal?: string;
  }) => {
    try {
      // Construir URL con parámetros
      const params = new URLSearchParams({
        movil: datos.movilNumero,
        conductorId: datos.conductorId.toString(),
        conductorNombre: datos.conductorNombre
      });

      // Si es un móvil diferente, agregar el móvil original
      if (datos.esDiferente && datos.movilOriginal) {
        params.append('movilOriginal', datos.movilOriginal);
      }

      // Pasar la hora de salida como ISO si está disponible
      const horaSalida = programadoParaRecibo?.horaSalida;
      if (typeof horaSalida === 'string' && horaSalida.includes('T')) {
        params.append('horaSalidaISO', horaSalida);
      }

      const response = await fetch(`/api/programados/${programadoParaRecibo.id}/recibo?${params.toString()}`);
      if (response.ok) {
        const reciboData = await response.json();
        if (reciboData) {
          const printWindow = window.open('', '_blank', 'width=1,height=1,left=-1000,top=-1000,scrollbars=no,resizable=no,toolbar=no,location=no,directories=no,status=no,menubar=no');
          if (printWindow) {
            const htmlContent = createReceiptHTML(reciboData, false);
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 500);
          }
        }
        
        // Actualizar las rutas después de generar el recibo exitosamente
        await fetchRutas();
        
      } else {
        console.error('Error al generar el recibo');
      }
    } catch (error) {
      console.error('Error al imprimir el recibo:', error);
    }
  };

  // Exponer la función de actualización al componente padre
  useImperativeHandle(ref, () => ({
    actualizarRutas: async () => {
      await fetchRutas();
    }
  }));

  useEffect(() => {
    if (movilId && movilId > 0) {
      fetchRutas();
    } else {
      setRutas([]);
      setLoading(false);
    }
  }, [movilId, movilNombre]);

  const getEstadoIcon = (estado: string) => {
    if (estado.startsWith('COMPLETADO')) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (estado === 'NO_COMPLETADO') {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    if (estado === 'PROGRAMADO') {
      return <Clock className="w-4 h-4 text-orange-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-gray-500" />;
  };

  const getEstadoColor = (estado: string) => {
    if (estado.startsWith('COMPLETADO')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (estado === 'NO_COMPLETADO') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    if (estado === 'PROGRAMADO') {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Función para imprimir recibo usando la misma lógica que turno/page.tsx
  const imprimirRecibo = async (ruta: Ruta) => {
    try {
      if ((ruta as any).tipo === 'programado') {
        // Para rutas programadas, abrir modal de confirmación
        abrirModalReciboProgramado(ruta);
      } else {
        // Para turnos normales, usar la misma lógica que turno/page.tsx
        const response = await fetch(`/api/turnos/${ruta.id}/recibo`);
        if (response.ok) {
          const reciboData = await response.json();
          if (reciboData) {
            const printWindow = window.open('', '_blank', 'width=1,height=1,left=-1000,top=-1000,scrollbars=no,resizable=no,toolbar=no,location=no,directories=no,status=no,menubar=no');
            if (printWindow) {
              const htmlContent = createReceiptHTML(reciboData, true);
              printWindow.document.write(htmlContent);
              printWindow.document.close();
              setTimeout(() => {
                printWindow.print();
                printWindow.close();
              }, 500);
            }
          }
          
          // Actualizar las rutas después de generar el recibo exitosamente
          await fetchRutas();
          
        } else {
          console.error('Error al generar el recibo');
        }
      }
    } catch (error) {
      console.error('Error al imprimir el recibo:', error);
    }
  };

  // Toggle de estado para turnos (NO_COMPLETADO <-> COMPLETADO)
  const toggleEstadoTurno = async (ruta: Ruta) => {
    try {
      // Solo aplica para turnos normales (no programados)
      if ((ruta as any).tipo === 'programado') return;

      const nuevoEstado = ruta.estado === 'NO_COMPLETADO' ? 'COMPLETADO' : 'NO_COMPLETADO';
      const response = await fetch(`/api/turnos/${ruta.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...TimeService.getSimulationHeaders()
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error actualizando estado del turno:', errorText);
        alert('Error actualizando estado del turno');
        return;
      }

      
      alert(`Estado actualizado a ${nuevoEstado}`);
      await fetchRutas();
    } catch (error) {
      console.error('Error al cambiar estado del turno:', error);
    }
  };

  // Eliminar turno
  const eliminarTurno = async (ruta: Ruta) => {
    try {
      if ((ruta as any).tipo === 'programado') return;

      const response = await fetch(`/api/turnos/${ruta.id}`, {
        method: 'DELETE',
        headers: {
          ...TimeService.getSimulationHeaders()
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error eliminando turno:', errorText);
        alert('Error eliminando turno');
        return;
      }
      
      alert('Turno eliminado');
      await fetchRutas();
    } catch (error) {
      console.error('Error al eliminar turno:', error);
    }
  };

  // Función para crear el HTML del recibo - igual que en turno/page.tsx
  const createReceiptHTML = (reciboData: any, includeConductor: boolean) => {
    const conductorRow = includeConductor ? `
      <div class="info-row">
        <span class="label">Conductor:</span>
        <span class="value">${reciboData.conductor}</span>
      </div>` : '';

    // Si es una sustitución, agregar información del móvil original
    const sustitucionInfo = reciboData.esSustitucion ? `
      <div class="info-row" style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 4px; margin: 4px 0;">
        <span class="label">⚠️ Móvil Original:</span>
        <span class="value">${reciboData.movilOriginal}</span>
      </div>` : '';

    return `<!DOCTYPE html>
<html>
<head>
  <title>Recibo</title>
  <style>
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body { margin: 0; padding: 8px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.3; }
    }
    body { margin: 0; padding: 8px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.3; width: 80mm; max-width: 80mm; }
    .header { text-align: center; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .logo { width: 50px; height: 50px; display: block; }
    .company-name { font-size: 16px; font-weight: bold; }
    .title { font-size: 15px; font-weight: bold; text-align: center; margin: 8px 0; border-bottom: 2px solid #000; padding-bottom: 4px; }
    .info-row { display: flex; justify-content: space-between; margin: 4px 0; padding: 2px; }
    .label { font-weight: bold; font-size: 13px; }
    .value { text-align: right; font-size: 13px; }
    .hora-salida { font-size: 20px; font-weight: bold; text-align: center; margin: 8px 0; padding: 6px; }
    .ruta-destacada { font-size: 28px; font-weight: bold; text-align: center; margin: 8px 0; padding: 8px; }
    .footer { text-align: center; margin-top: 8px; font-size: 11px; border-top: 1px solid #000; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="/logo png.png" alt="Logo" class="logo" />
    <div class="company-name">SOTRAM S.A</div>
  </div>
  <div class="title">PLANILLA DE VIAJE No. ${reciboData.id}</div>
  <div class="hora-salida">Hora de salida: ${reciboData.horaSalida}</div>
  <div class="ruta-destacada">${reciboData.ruta}</div>
  <div class="info-row"><span class="label">Fecha:</span><span class="value">${reciboData.fechaSalida}</span></div>
  <div class="info-row"><span class="label">Móvil:</span><span class="value">${reciboData.movil}</span></div>
  <div class="info-row"><span class="label">Placa:</span><span class="value">${reciboData.placa}</span></div>${sustitucionInfo}${conductorRow}
  <div class="info-row"><span class="label">Despachado por:</span><span class="value">${reciboData.despachadoPor}</span></div>
  <div class="info-row"><span class="label">Registro:</span><span class="value">${reciboData.registro}</span></div>
  <div class="footer">EnRuta 2025</div>
</body>
</html>`;
  };

  // Función para formatear horas
  const formatHora = (hora: string | number): string => {
    const date = new Date(hora);
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  function formatHourString(hourStr: string) {
  // Aseguramos que el string tenga al menos 4 dígitos con ceros a la izquierda
  const normalized = hourStr.padStart(4, "0");

  const hours = normalized.slice(0, -2); // primeros 2 dígitos
  const minutes = normalized.slice(-2);  // últimos 2 dígitos

  return `${hours}:${minutes}`;
}


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
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Car className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Despachos del Móvil {movilNombre}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Hoy</span>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {rutas.length} rutas
            </span>
          </div>
        </div>
      </div>

      {rutas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No hay rutas programadas para hoy</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-3">
            {rutas.map((ruta) => (
              <div
                key={ruta.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${ruta.tipo === 'programado'
                  ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatHora(ruta.horaSalida)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{ruta.conductor.nombre}</span>
                  </div>

                  <div className="text-sm text-gray-600">
                    {ruta.ruta?.nombre || 'Sin ruta'}
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
                  <button
                    onClick={() => imprimirRecibo(ruta)}
                    className="ml-2 p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Generar Recibo"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  {/* Botón toggle de estado solo para turnos (no programados) */}
                  {ruta.tipo !== 'programado' && (
                    <button
                      onClick={() => toggleEstadoTurno(ruta)}
                      className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                      title="Alternar estado NO_COMPLETADO/COMPLETADO"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                  )}
                  {/* Botón eliminar solo para turnos (no programados) */}
                  {ruta.tipo !== 'programado' && (
                    <button
                      onClick={() => eliminarTurno(ruta)}
                      className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Eliminar turno"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para confirmar datos del recibo programado */}
      <ModalConfirmarReciboProgramado
        isOpen={showModalReciboProgramado}
        onClose={cerrarModalReciboProgramado}
        programado={programadoParaRecibo}
        onConfirmar={confirmarReciboProgramado}
      />
    </div>
  );
});