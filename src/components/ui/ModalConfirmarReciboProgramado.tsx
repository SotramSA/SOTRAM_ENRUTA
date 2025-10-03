'use client';

import { useState, useEffect } from 'react';
import { ModalForm } from './ModalForm';
import { Button } from './Button';
import { Input } from './Input';
import { AutoComplete } from './Autocomplete';
import { Label } from './Label';

interface Conductor {
  id: number;
  nombre: string;
  cedula?: string;
}

interface ModalConfirmarReciboProgramadoProps {
  isOpen: boolean;
  onClose: () => void;
  programado: {
    id: number;
    movil: { id: number; movil: string; };
  } | null;
  onConfirmar: (datos: {
    movilNumero: string;
    conductorId: number;
    conductorNombre: string;
    esDiferente: boolean;
    movilOriginal?: string;
  }) => void;
}

export default function ModalConfirmarReciboProgramado({
  isOpen,
  onClose,
  programado,
  onConfirmar
}: ModalConfirmarReciboProgramadoProps) {
  const [movilNumero, setMovilNumero] = useState('');
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [conductorSeleccionado, setConductorSeleccionado] = useState<Conductor | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoConductores, setCargandoConductores] = useState(false);

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && programado) {
      setMovilNumero(programado.movil.movil);
      setConductorSeleccionado(null);
      cargarConductores(programado.movil.id);
    }
  }, [isOpen, programado]);

  const cargarConductores = async (automovilId: number) => {
    setCargandoConductores(true);
    try {
      const response = await fetch(`/api/conductores-automovil/${automovilId}`);
      if (response.ok) {
        const data = await response.json();
        setConductores(data.conductores || []);
      } else {
        console.error('Error al cargar conductores');
        setConductores([]);
      }
    } catch (error) {
      console.error('Error al cargar conductores:', error);
      setConductores([]);
    } finally {
      setCargandoConductores(false);
    }
  };

  const cargarConductoresPorMovil = async (numeroMovil: string) => {
    setCargandoConductores(true);
    try {
      // Buscar el automóvil por número de móvil
      const response = await fetch(`/api/automoviles?movil=${numeroMovil}`);
      if (response.ok) {
        const data = await response.json();
        if (data.automoviles && data.automoviles.length > 0) {
          const automovil = data.automoviles[0];
          await cargarConductores(automovil.id);
        } else {
          setConductores([]);
        }
      } else {
        setConductores([]);
      }
    } catch (error) {
      console.error('Error al buscar móvil:', error);
      setConductores([]);
    } finally {
      setCargandoConductores(false);
    }
  };

  const handleMovilChange = (valor: string) => {
    setMovilNumero(valor);
    setConductorSeleccionado(null);
    
    // Si el móvil cambió, cargar conductores del nuevo móvil
    if (valor && valor !== programado?.movil.movil) {
      cargarConductoresPorMovil(valor);
    } else if (valor === programado?.movil.movil && programado) {
      // Si volvió al móvil original, cargar sus conductores
      cargarConductores(programado.movil.id);
    }
  };

  const handleConfirmar = () => {
    if (!conductorSeleccionado || !programado) return;

    const esDiferente = movilNumero !== programado.movil.movil;
    
    onConfirmar({
      movilNumero,
      conductorId: conductorSeleccionado.id,
      conductorNombre: conductorSeleccionado.nombre,
      esDiferente,
      movilOriginal: esDiferente ? programado.movil.movil : undefined
    });
    
    onClose();
  };

  const handleCancelar = () => {
    onClose();
  };

  if (!programado) {
    return null;
  }

  if (!programado.movil || !programado.movil.movil) {
    return null;
  }

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Confirmar Datos del Recibo"
      size="md"
    >
      <div className="space-y-4">
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-sm text-green-700">
            <strong>✅ Programado:</strong> Móvil {programado.movil.movil}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Confirma o cambia el móvil que realizará este servicio y selecciona el conductor
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="movil">Número de Móvil</Label>
            <Input
              id="movil"
              type="text"
              value={movilNumero}
              onChange={(e) => handleMovilChange(e.target.value)}
              placeholder="Ej: 30, 45, 12..."
              className="mt-1"
            />
            {movilNumero !== programado.movil.movil && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Móvil diferente al programado ({programado.movil.movil})
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="conductor">Conductor</Label>
            {cargandoConductores ? (
              <div className="mt-1 p-2 text-center text-gray-500">
                Cargando conductores...
              </div>
            ) : (
              <AutoComplete
                options={conductores.map(c => ({ 
                  id: c.id, 
                  label: c.nombre,
                  subtitle: c.cedula || ''
                }))}
                value={conductorSeleccionado?.nombre || ''}
                onValueChange={(value) => {
                  // Buscar el conductor por nombre
                  const conductor = conductores.find(c => c.nombre === value);
                  if (conductor) {
                    setConductorSeleccionado(conductor);
                  } else if (!value) {
                    setConductorSeleccionado(null);
                  }
                }}
                onSelect={(option) => {
                  const conductor = conductores.find(c => c.id === option.id);
                  if (conductor) {
                    setConductorSeleccionado(conductor);
                  }
                }}
                placeholder="Selecciona un conductor..."
                className="mt-1"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            onClick={handleCancelar}
            variant="outline"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!conductorSeleccionado || cargando}
            className="bg-green-600 hover:bg-green-700"
          >
            {cargando ? 'Generando...' : 'Generar Recibo'}
          </Button>
        </div>
      </div>
    </ModalForm>
  );
}
