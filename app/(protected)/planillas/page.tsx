'use client'

import { useEffect, useState } from 'react'
import { Search, Calendar, Save, Trash2, ChevronLeft, ChevronRight, Car, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import axios from 'axios'
import { useNotifications, createApiNotifications } from '@/src/lib/notifications'
import RouteGuard from '@/src/components/RouteGuard'
import { 
  formatDateToYYYYMMDD, 
  formatDateToYYYYMMDDLocal,
    createDateFromComponentsLocal,
  getFirstDayOfCurrentMonth,
  getMonthName 
} from '@/src/lib/utils'

interface Automovil {
  id: number
  movil: string
  placa: string
  activo: boolean
}

interface Planilla {
  id: number
  fecha: string
  movilId: number
}

interface SancionAutomovil {
  id: number
  automovilId: number
  fechaInicio: string
  fechaFin: string
  motivo: string
}

interface FechaSeleccionada {
  fecha: string
  disponible: boolean
  sancionado: boolean
  motivoSancion?: string
}

export default function PlanillasManager() {
  const notifications = useNotifications()
  const apiNotifications = createApiNotifications(notifications)
  
  const [automoviles, setAutomoviles] = useState<Automovil[]>([])
  const [automovilSeleccionado, setAutomovilSeleccionado] = useState<Automovil | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentDate, setCurrentDate] = useState(getFirstDayOfCurrentMonth)
  const [fechasMes, setFechasMes] = useState<FechaSeleccionada[]>([])
  const [planillasExistentes, setPlanillasExistentes] = useState<Planilla[]>([])
  const [sancionesAutomovil, setSancionesAutomovil] = useState<SancionAutomovil[]>([])
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false)
  const [isLoadingSanciones, setIsLoadingSanciones] = useState(false)
  const [ultimaFechaSeleccionada, setUltimaFechaSeleccionada] = useState<string | null>(null)

  // Cache para sanciones verificadas con TTL (Time To Live)
  const [sancionesCache, setSancionesCache] = useState<Map<string, { sancionado: boolean, motivoSancion?: string, timestamp: number }>>(new Map())
  
  // TTL para cache: 5 minutos
  const CACHE_TTL = 5 * 60 * 1000

  // Estados para modal de descarga Excel
  const [mostrarModalExcel, setMostrarModalExcel] = useState(false)
  const [fechaInicioExcel, setFechaInicioExcel] = useState('')
  const [fechaFinExcel, setFechaFinExcel] = useState('')
  const [cargandoExcel, setCargandoExcel] = useState(false)

  // Función optimizada para verificar si una fecha está sancionada (comparación exacta de fecha)
  const verificarSancion = (fecha: string, sanciones: SancionAutomovil[]) => {
    const now = Date.now()

    // Cache con TTL
    const cached = sancionesCache.get(fecha)
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return { sancionado: cached.sancionado, motivoSancion: cached.motivoSancion }
    }

    // Comparar por rango [fechaInicio, fechaFin]
    const fechaRef = new Date(fecha)
    let encontrada: SancionAutomovil | undefined

    if (!isNaN(fechaRef.getTime())) {
      encontrada = sanciones.find(s => {
        if (!s?.fechaInicio || !s?.fechaFin) return false
        const ini = new Date(s.fechaInicio)
        const fin = new Date(s.fechaFin)
        if (isNaN(ini.getTime()) || isNaN(fin.getTime())) return false
        // Normalizar a 00:00 para comparación por día
        const ref = new Date(fechaRef.getFullYear(), fechaRef.getMonth(), fechaRef.getDate())
        const iniDay = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate())
        const finDay = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate())
        return iniDay <= ref && ref <= finDay
      })
    }

    const resultado = encontrada
      ? { sancionado: true, motivoSancion: encontrada.motivo }
      : { sancionado: false, motivoSancion: undefined }

    setSancionesCache(prev => new Map(prev.set(fecha, { ...resultado, timestamp: now })))
    return resultado
  }

  // Limpiar cache cuando cambian las sanciones
  useEffect(() => {
    setSancionesCache(new Map())
  }, [sancionesAutomovil])

  // Generar fechas del mes actual con verificación de sanciones
  const generarFechasMes = (fecha: Date, planillas: Planilla[], sanciones: SancionAutomovil[]) => {
    const año = fecha.getFullYear()
    const mes = fecha.getMonth()
  
    // Obtener el primer día del mes
    const primerDia = new Date(año, mes, 1)
    const ultimoDia = new Date(año, mes + 1, 0)
  
    const fechas: FechaSeleccionada[] = []
  
    // Calcular correctamente el día de la semana (0 = Domingo)
    const diaSemanaPrimerDia = primerDia.getDay()
  
    // Agregar espacios vacíos para alinear con los días de la semana
    for (let i = 0; i < diaSemanaPrimerDia; i++) {
      fechas.push({
        fecha: '',
        disponible: false,
        sancionado: false
      })
    }
  
    // Agregar los días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      // Generar el string de la fecha manualmente en formato YYYY-MM-DD
      const mesString = (mes + 1).toString().padStart(2, '0')
      const diaString = dia.toString().padStart(2, '0')
      const fechaString = `${año}-${mesString}-${diaString}`
      
      const existe = planillas.some(p => p.fecha === fechaString)
      const { sancionado, motivoSancion } = verificarSancion(fechaString, sanciones)
      
      // Debug: mostrar información sobre fechas específicas
      if (planillas.some(p => p.fecha === fechaString)) {
        console.log(`✅ Fecha ${fechaString} encontrada en planillas`)
      } else {
        // Solo mostrar para fechas que no están en planillas para evitar spam
        if (fechaString.includes('2025-08-')) {
          console.log(`❌ Fecha ${fechaString} NO encontrada en planillas`)
        }
      }

      fechas.push({
        fecha: fechaString,
        disponible: existe,
        sancionado,
        motivoSancion
      })
    }
  
    setFechasMes(fechas)
    console.log('📊 Fechas generadas:', fechas.filter(f => f.fecha).map(f => ({ fecha: f.fecha, disponible: f.disponible })))
  }

  // CORRECCIÓN ADICIONAL: Función mejorada para obtener la fecha de hoy
const getFechaHoy = () => {
  const hoy = new Date()
  const año = hoy.getFullYear()
  const mes = hoy.getMonth()
  const dia = hoy.getDate()
  
  return `${año}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`
}
  // Cargar automóviles para búsqueda
  const fetchAutomoviles = async () => {
    try {
      const res = await axios.get('/api/automoviles?limit=1000&activo=true')
      setAutomoviles(res.data.automoviles || [])
    } catch (error) {
      apiNotifications.fetchError('automóviles')
    }
  }

  // Cargar sanciones del automóvil seleccionado
  const fetchSanciones = async () => {
    if (!automovilSeleccionado) return

    setIsLoadingSanciones(true)
    try {
      const res = await axios.get(`/api/sancionAutomovil?automovilId=${automovilSeleccionado.id}&limit=1000`)
      return res.data.sanciones || []
    } catch (error) {
      console.error('Error al cargar sanciones:', error)
      return []
    } finally {
      setIsLoadingSanciones(false)
    }
  }

  // Cargar planillas del automóvil seleccionado para el mes actual
  const fetchPlanillas = async () => {
    if (!automovilSeleccionado) return

    setIsLoadingCalendar(true)
    try {
      const año = currentDate.getFullYear()
      const mes = currentDate.getMonth() + 1

      console.log(`🔍 Consultando planillas para automóvil ${automovilSeleccionado.id}, año ${año}, mes ${mes}`)
      
      const res = await axios.get(`/api/planillas?automovilId=${automovilSeleccionado.id}&año=${año}&mes=${mes}`)
      
      console.log('📡 Respuesta completa de API planillas:', res.data)
      console.log('📦 Planillas extraídas:', res.data.planillas)
      
      return res.data.planillas || []
    } catch (error) {
      console.error('❌ Error al cargar planillas:', error)
      apiNotifications.fetchError('planillas')
      return []
    } finally {
      setIsLoadingCalendar(false)
    }
  }

  // Función que carga todo de forma secuencial
  const cargarDatosCompletos = async () => {
    if (!automovilSeleccionado) return

    setIsLoadingCalendar(true)
    setIsLoadingSanciones(true)

    try {
      console.log('🔄 Iniciando carga de datos completos...')
      
      // Limpiar estado antes de cargar
      setPlanillasExistentes([])
      setSancionesAutomovil([])
      setSancionesCache(new Map())
      
      // Cargar sanciones primero
      const sanciones = await fetchSanciones()
      setSancionesAutomovil(sanciones)
      console.log('📋 Sanciones cargadas:', sanciones.length)

      // Luego cargar planillas
      const planillas = await fetchPlanillas()
      console.log('📅 Planillas recibidas de API:', planillas)
      setPlanillasExistentes(planillas)
      console.log('📅 Planillas cargadas:', planillas.length)
      console.log('📅 Fechas de planillas:', planillas.map((p: Planilla) => p.fecha))

      // Finalmente generar las fechas con ambos datos
      generarFechasMes(currentDate, planillas, sanciones)
      console.log('🎯 Fechas del mes generadas')
    } catch (error) {
      console.error('Error al cargar datos completos:', error)
    } finally {
      setIsLoadingCalendar(false)
      setIsLoadingSanciones(false)
    }
  }

  // Filtrar automóviles por búsqueda
  const automovilesFiltrados = automoviles.filter(auto =>
    auto.movil.toLowerCase().includes(searchTerm.toLowerCase()) ||
    auto.placa.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Manejar selección de automóvil
  const handleAutomovilSelect = (automovil: Automovil) => {
    setAutomovilSeleccionado(automovil)
    setSearchTerm('')
    setFechasSeleccionadas(new Set())
    setFechasMes([]) // Limpiar fechas del mes anterior
    setPlanillasExistentes([]) // Limpiar planillas anteriores
    setSancionesAutomovil([]) // Limpiar sanciones anteriores
    setSancionesCache(new Map()) // Limpiar cache
    setUltimaFechaSeleccionada(null) // Limpiar última fecha seleccionada
  }

  // Manejar cambio de mes
  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    const nuevaFecha = new Date(currentDate)
    if (direccion === 'anterior') {
      nuevaFecha.setMonth(nuevaFecha.getMonth() - 1)
    } else {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + 1)
    }
    
    setCurrentDate(nuevaFecha)
    setFechasSeleccionadas(new Set())
    setUltimaFechaSeleccionada(null) // Limpiar última fecha seleccionada

    // Si hay un automóvil seleccionado, cargar las planillas del nuevo mes
    if (automovilSeleccionado) {
      cargarDatosCompletos()
    }
  }

  // Manejar clic en fecha del calendario
  const handleFechaClick = (fecha: string, event: React.MouseEvent) => {
    if (!fecha) return // No hacer nada si es un espacio vacío
    
    // Verificar si la fecha está sancionada
    const fechaData = fechasMes.find(f => f.fecha === fecha)
    if (fechaData?.sancionado) {
      notifications.warning(`Esta fecha está sancionada: ${fechaData.motivoSancion}`)
      return
    }

    const nuevasSeleccionadas = new Set(fechasSeleccionadas)

    // Si se presiona Shift y hay una fecha previamente seleccionada, seleccionar rango
    if (event.shiftKey && ultimaFechaSeleccionada) {
      const fechasEnRango = obtenerFechasEnRango(ultimaFechaSeleccionada, fecha)
      
      // Determinar si estamos agregando o quitando el rango
      const fechaActualSeleccionada = nuevasSeleccionadas.has(fecha)
      const ultimaFechaSeleccionadaEstado = nuevasSeleccionadas.has(ultimaFechaSeleccionada)
      
      // Si ambas fechas están en el mismo estado, mantener ese estado para todo el rango
      // Si están en estados diferentes, usar el estado de la fecha actual
      const estadoObjetivo = fechaActualSeleccionada === ultimaFechaSeleccionadaEstado 
        ? !fechaActualSeleccionada // Invertir el estado actual
        : !fechaActualSeleccionada // Usar el estado opuesto al actual
      
      // Aplicar el estado a todas las fechas del rango que no estén sancionadas
      fechasEnRango.forEach(fechaRango => {
        const fechaRangoData = fechasMes.find(f => f.fecha === fechaRango)
        if (fechaRangoData && !fechaRangoData.sancionado) {
          if (estadoObjetivo) {
            nuevasSeleccionadas.add(fechaRango)
          } else {
            nuevasSeleccionadas.delete(fechaRango)
          }
        }
      })
    } else {
      // Selección normal (una fecha)
      if (nuevasSeleccionadas.has(fecha)) {
        nuevasSeleccionadas.delete(fecha)
      } else {
        nuevasSeleccionadas.add(fecha)
      }
    }

    setFechasSeleccionadas(nuevasSeleccionadas)
    setUltimaFechaSeleccionada(fecha)
  }

  // Función para obtener todas las fechas en un rango
  const obtenerFechasEnRango = (fechaInicial: string, fechaFinal: string): string[] => {
    const fechas: string[] = []
    const inicio = new Date(fechaInicial)
    const fin = new Date(fechaFinal)
    
    // Asegurar que inicio sea la fecha menor
    const fechaMenor = inicio < fin ? inicio : fin
    const fechaMayor = inicio < fin ? fin : inicio
    
    const fechaActual = new Date(fechaMenor)
    
    while (fechaActual <= fechaMayor) {
      const fechaString = fechaActual.toISOString().split('T')[0]
      fechas.push(fechaString)
      fechaActual.setDate(fechaActual.getDate() + 1)
    }
    
    return fechas
  }

  // Obtener fechas que se pueden agregar (rojas) vs eliminar (verdes)
  const fechasParaAgregar = Array.from(fechasSeleccionadas).filter(fecha => {
    const fechaData = fechasMes.find(f => f.fecha === fecha)
    return fechaData && !fechaData.disponible && !fechaData.sancionado
  })
  
  const fechasParaEliminar = Array.from(fechasSeleccionadas).filter(fecha => {
    const fechaData = fechasMes.find(f => f.fecha === fecha)
    return fechaData && fechaData.disponible && !fechaData.sancionado
  })

  // Eliminar fechas seleccionadas (marcar como no disponibles)
  const handleEliminar = async () => {
    if (!automovilSeleccionado || fechasParaEliminar.length === 0) {
      notifications.error('Selecciona fechas verdes para eliminar')
      return
    }

    // Verificar que no haya fechas sancionadas en la selección
    const fechasSancionadas = Array.from(fechasSeleccionadas).filter(fecha => {
      const fechaData = fechasMes.find(f => f.fecha === fecha)
      return fechaData?.sancionado
    })

    if (fechasSancionadas.length > 0) {
      notifications.warning('No se pueden eliminar fechas sancionadas')
      return
    }

    setIsLoading(true)
    try {
      // Buscar las planillas existentes para las fechas seleccionadas
      const planillasAEliminar = planillasExistentes.filter(p =>
        fechasParaEliminar.includes(p.fecha)
      )

      // Eliminar cada planilla
      for (const planilla of planillasAEliminar) {
        await axios.delete(`/api/planillas/${planilla.id}`)
      }

      notifications.success(`${planillasAEliminar.length} fecha(s) eliminada(s) correctamente`)
      setFechasSeleccionadas(new Set())
      
      // Recargar datos completos para actualizar el calendario inmediatamente
      await cargarDatosCompletos()
    } catch (error) {
      apiNotifications.deleteError('fechas')
    } finally {
      setIsLoading(false)
    }
  }

  // Función para descargar reporte Excel
  const handleDescargarExcel = async () => {
    if (!fechaInicioExcel || !fechaFinExcel) {
      notifications.error('Por favor selecciona ambas fechas')
      return
    }

    if (new Date(fechaInicioExcel) > new Date(fechaFinExcel)) {
      notifications.error('La fecha de inicio debe ser anterior a la fecha de fin')
      return
    }

    setCargandoExcel(true)
    try {
      const response = await axios.post('/api/planillas/reporte-excel', {
        fechaInicio: fechaInicioExcel,
        fechaFin: fechaFinExcel
      }, {
        responseType: 'blob'
      })

      // Crear URL del blob y descargar
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Crear nombre del archivo
      const fechaInicioStr = fechaInicioExcel.replace(/-/g, '')
      const fechaFinStr = fechaFinExcel.replace(/-/g, '')
      link.download = `Reporte_Planillas_${fechaInicioStr}_${fechaFinStr}.xlsx`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      notifications.success('Reporte Excel descargado correctamente')
      setMostrarModalExcel(false)
      
    } catch (error) {
      console.error('Error al descargar Excel:', error)
      notifications.error('Error al generar el reporte Excel')
    } finally {
      setCargandoExcel(false)
    }
  }

  // Guardar cambios
  const handleGuardar = async () => {
    if (!automovilSeleccionado || fechasParaAgregar.length === 0) {
      notifications.error('Selecciona fechas rojas para agregar')
      return
    }

    // Verificar que no haya fechas sancionadas en la selección
    const fechasSancionadas = Array.from(fechasSeleccionadas).filter(fecha => {
      const fechaData = fechasMes.find(f => f.fecha === fecha)
      return fechaData?.sancionado
    })

    if (fechasSancionadas.length > 0) {
      notifications.warning('No se pueden agregar fechas sancionadas')
      return
    }

    setIsLoading(true)
    try {
      console.log('🔄 Creando planillas para fechas:', fechasParaAgregar)
      
      const response = await axios.post('/api/planillas', {
        automovilId: automovilSeleccionado.id,
        fechas: fechasParaAgregar
      })

      console.log('✅ Respuesta de creación:', response.data)
      
      const { count, fechasCreadas, fechasExistentes, fechasConError, message } = response.data
      
      // Mostrar notificación con información detallada
      if (count > 0) {
        notifications.success(message)
      } else if (fechasExistentes.length > 0) {
        notifications.warning(message)
      } else {
        notifications.error(message)
      }
      
      setFechasSeleccionadas(new Set())
      
      // Solo recargar si realmente se crearon planillas nuevas
      if (count > 0) {
        console.log('🔄 Recargando datos porque se crearon planillas nuevas')
        // Esperar un poco antes de recargar para asegurar que la base de datos se actualice
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Recargar datos completos para actualizar el calendario inmediatamente
        await cargarDatosCompletos()
        
        console.log('🔄 Datos recargados después de crear planillas')
      } else {
        console.log('⏭️ No se recargan datos porque no se crearon planillas nuevas')
      }
    } catch (error) {
      console.error('❌ Error al crear planillas:', error)
      apiNotifications.createError('fechas')
    } finally {
      setIsLoading(false)
    }
  }

  // Obtener nombre del mes
  const getNombreMes = (fecha: Date) => {
    return getMonthName(fecha)
  }



  // Nombres de días de la semana
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  useEffect(() => {
    fetchAutomoviles()
  }, [])

  useEffect(() => {
    if (automovilSeleccionado) {
      // Cargar todo de forma secuencial
      cargarDatosCompletos()
    } else {
      // Limpiar fechas cuando no hay automóvil seleccionado
      setFechasMes([])
      setPlanillasExistentes([])
      setSancionesAutomovil([])
      setSancionesCache(new Map())
      setUltimaFechaSeleccionada(null) // Limpiar última fecha seleccionada
    }
  }, [automovilSeleccionado, currentDate])

  // Remover el useEffect adicional ya que ahora todo se maneja en cargarDatosCompletos

  return (
    <RouteGuard requiredPermission="tablaPlanilla">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Planillas</h1>
                <p className="text-gray-600 mt-1">Administra las fechas disponibles de trabajo por automóvil</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarModalExcel(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Descargar Excel
                </button>
                <button
                  onClick={() => {
                    console.log('🧹 Limpiando estado y forzando recarga...')
                    setPlanillasExistentes([])
                    setSancionesAutomovil([])
                    setSancionesCache(new Map())
                    setFechasMes([])
                    setFechasSeleccionadas(new Set())
                    if (automovilSeleccionado) {
                      cargarDatosCompletos()
                    }
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  🔄 Forzar Recarga
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-5 h-5" />
                  <span>Calendario de Disponibilidad</span>
                </div>
              </div>
            </div>
          </div>

          {/* Buscador de Automóviles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar automóvil por móvil o placa..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Lista de automóviles filtrados */}
            {searchTerm && automovilesFiltrados.length > 0 && (
              <div className="mt-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                {automovilesFiltrados.map((automovil) => (
                  <button
                    key={automovil.id}
                    onClick={() => handleAutomovilSelect(automovil)}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3 cursor-pointer"
                  >
                    <Car className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">Móvil {automovil.movil}</div>
                      <div className="text-sm text-gray-500">Placa: {automovil.placa}</div>
                    </div>
                    {automovil.activo ? (
                      <span className="ml-auto px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Activo
                      </span>
                    ) : (
                      <span className="ml-auto px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                        Inactivo
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Automóvil seleccionado */}
            {automovilSeleccionado && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Car className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-medium text-blue-900">
                      Móvil {automovilSeleccionado.movil} - {automovilSeleccionado.placa}
                    </div>
                    <div className="text-sm text-blue-700">
                      Seleccionado para gestión de planillas
                    </div>
                  </div>
                  {isLoadingSanciones && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando sanciones...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mensaje de estado */}
          {/* Removed message state and its usage */}

          {/* Calendario */}
          {automovilSeleccionado && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Mensaje de carga */}
              {(isLoadingCalendar || isLoadingSanciones) && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <div className="font-medium text-blue-900">
                        {isLoadingSanciones ? 'Cargando sanciones del automóvil...' : 'Cargando planillas del mes...'}
                      </div>
                      <div className="text-sm text-blue-700">
                        Por favor espera mientras se cargan los datos necesarios para mostrar el calendario correctamente.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Header del calendario */}
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => cambiarMes('anterior')}
                  disabled={isLoadingCalendar || isLoadingSanciones}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-900 capitalize">
                    {getNombreMes(currentDate)}
                  </h2>
                  {(isLoadingCalendar || isLoadingSanciones) && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>

                <button
                  onClick={() => cambiarMes('siguiente')}
                  disabled={isLoadingCalendar || isLoadingSanciones}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {diasSemana.map((dia) => (
                  <div key={dia} className="p-2 text-center text-sm font-medium text-gray-500">
                    {dia}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-1">
                {isLoadingCalendar || isLoadingSanciones ? (
                  // Mostrar skeleton loading
                  Array.from({ length: Math.max(42, fechasMes.length) }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="p-2 h-12 rounded-lg border-2 bg-gray-100 animate-pulse"
                    ></div>
                  ))
                ) : (
                  fechasMes.map((fecha, index) => {
                    // Si es un espacio vacío (fecha vacía)
                    if (!fecha.fecha) {
                      return <div key={`empty-${index}`} className="p-2"></div>
                    }

                    const isSelected = fechasSeleccionadas.has(fecha.fecha)
                    const isToday = fecha.fecha === getFechaHoy()
                    const isSancionado = fecha.sancionado

                    return (
                      <button
                        key={fecha.fecha}
                        onClick={(event) => handleFechaClick(fecha.fecha, event)}
                        disabled={isLoadingCalendar || isLoadingSanciones}
                        title={isSancionado ? `Sancionado: ${fecha.motivoSancion}` : ''}
                        className={`p-2 h-12 rounded-lg border-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed relative
                          ${fecha.disponible && !isSancionado
                            ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200' 
                            : !fecha.disponible && !isSancionado
                            ? 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200'
                            : 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200'
                          }
                          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                          ${isToday ? 'font-bold' : ''}
                          ${isSancionado ? 'cursor-not-allowed' : ''}
                        `}
                      >
                        {fecha.fecha ? new Date(fecha.fecha + 'T00:00:00').getDate() : ''}
                        {isSancionado && (
                          <AlertTriangle className="w-3 h-3 absolute top-1 right-1 text-yellow-600" />
                        )}
                      </button>
                    )
                    
                  })
                )}
              </div>

              {/* Leyenda */}
              <div className="mt-6 flex items-center justify-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                  <span>Puede trabajar</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                  <span>No puede trabajar</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded relative">
                    <AlertTriangle className="w-2 h-2 absolute top-0.5 right-0.5 text-yellow-600" />
                  </div>
                  <span>Sancionado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 ring-2 ring-blue-500 ring-offset-2 rounded"></div>
                  <span>Seleccionado</span>
                </div>
              </div>

              {/* Resumen de selección */}
              {fechasSeleccionadas.size > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Resumen de selección:</div>
                  <div className="flex gap-4 text-sm flex-wrap">
                    {fechasParaAgregar.length > 0 && (
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                        {fechasParaAgregar.length} fecha(s) para agregar
                      </span>
                    )}
                    {fechasParaEliminar.length > 0 && (
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                        {fechasParaEliminar.length} fecha(s) para eliminar
                      </span>
                    )}
                    {Array.from(fechasSeleccionadas).filter(fecha => {
                      const fechaData = fechasMes.find(f => f.fecha === fecha)
                      return fechaData?.sancionado
                    }).length > 0 && (
                      <span className="flex items-center gap-1 text-yellow-700">
                        <AlertTriangle className="w-3 h-3" />
                        {Array.from(fechasSeleccionadas).filter(fecha => {
                          const fechaData = fechasMes.find(f => f.fecha === fecha)
                          return fechaData?.sancionado
                        }).length} fecha(s) sancionada(s)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Instrucciones de selección múltiple */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800 mb-2">
                  <strong>💡 Consejo:</strong> Selección múltiple de fechas
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>• <strong>Clic simple:</strong> Seleccionar/deseleccionar una fecha</div>
                  <div>• <strong>Shift + Clic:</strong> Seleccionar todas las fechas entre la última seleccionada y la actual</div>
                  <div>• <strong>Ejemplo:</strong> Haz clic en el día 5, luego Shift + clic en el día 15 para seleccionar del 5 al 15</div>
                </div>
              </div>

              {/* Botones de acción */}
              {fechasSeleccionadas.size > 0 && (
                <div className="mt-4 flex justify-center gap-4">
                  {fechasParaAgregar.length > 0 && (
                    <button
                      onClick={handleGuardar}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Save className="w-5 h-5" />
                      {isLoading ? 'Guardando...' : `Agregar ${fechasParaAgregar.length} fecha(s)`}
                    </button>
                  )}

                  {fechasParaEliminar.length > 0 && (
                    <button
                      onClick={handleEliminar}
                      disabled={isLoading}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                      {isLoading ? 'Eliminando...' : `Eliminar ${fechasParaEliminar.length} fecha(s)`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Instrucciones */}
          {!automovilSeleccionado && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona un Automóvil</h3>
              <p className="text-gray-600">
                Busca y selecciona un automóvil para comenzar a gestionar sus planillas de trabajo.
              </p>
            </div>
          )}
        </div>

        {/* Modal para Descarga Excel */}
        {mostrarModalExcel && (
          <div className="fixed inset-0 bg-gray-400/40  flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  Descargar Reporte Excel
                </h3>
                <button
                  onClick={() => setMostrarModalExcel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicial
                  </label>
                  <input
                    type="date"
                    value={fechaInicioExcel}
                    onChange={(e) => setFechaInicioExcel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Final
                  </label>
                  <input
                    type="date"
                    value={fechaFinExcel}
                    onChange={(e) => setFechaFinExcel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
              
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setMostrarModalExcel(false)}
                    disabled={cargandoExcel}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDescargarExcel}
                    disabled={cargandoExcel || !fechaInicioExcel || !fechaFinExcel}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {cargandoExcel ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generando...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        Descargar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  )
}