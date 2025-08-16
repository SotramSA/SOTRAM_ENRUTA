'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Clock, Car, RefreshCw, Trash2, Check, X, ChevronDown, ChevronRight, GripVertical, Info, MapPin, Settings, BarChart3, FileDown } from 'lucide-react'
import axios from 'axios'
import { useNotifications, createApiNotifications } from '@/src/lib/notifications'
import RouteGuard from '@/src/components/RouteGuard'
import { 
  Button,
  Card, CardContent, CardHeader, CardTitle,
  Badge
} from '@/src/components/ui'
import * as XLSX from 'xlsx'

interface Programacion {
  id: number
  fecha: string
  ruta: string
  hora: string
  movilId: number
  usuarioId?: number
  disponible: boolean
  movil: {
    id: number
    movil: string
    placa: string
  }
}

// Vista editable para drag & drop de móviles
interface ProgramacionView extends Omit<Programacion, 'movilId' | 'movil'> {
  originalMovilId: number
  currentMovil: MovilDisponible | null
}

interface MovilDisponible {
  id: number
  movil: string
  placa: string
}

// Definición de rutas y horarios
const RUTAS_HORARIOS = {
  'Despacho A': [
    '05:00', '05:10', '05:20', '05:28', '05:36', '05:44', '05:52',
    '06:00', '06:10', '06:20', '06:30', '06:40', '06:50', '07:00'
  ],
  'Despacho B': [
    '04:55', '05:05', '05:15', '05:25', '05:33', '05:41', '05:49', '05:57',
    '06:05', '06:15', '06:25', '06:35', '06:45', '06:55'
  ],
  'Despacho C': [
    '05:00', '05:10', '05:20', '05:30', '05:40', '05:50',
    '06:00', '06:10', '06:30', '06:50', '07:10', '07:30', '07:50', '08:10'
  ],
  'DESPACHO D. RUT7 CORZO LORETO': [
    '04:50', '04:57', '05:04', '05:11'
  ],
  'DESPACHO E RUT7 CORZO': [
    '04:55', '05:05', '05:15'
  ],
  'DESPACHO D RUT4 PAMPA-CORZO': [
    '04:50', '05:00', '05:10'
  ]
}

// Paletas de color por despacho para diferenciar tarjetas
const COLOR_SCHEMES = [
  { from: 'from-blue-600', to: 'to-indigo-600', lightFrom: 'hover:from-blue-50', lightTo: 'hover:to-indigo-50', badgeFrom: 'from-blue-100', badgeTo: 'to-indigo-100', badgeText: 'text-blue-800', border: 'border-blue-400' },
  { from: 'from-emerald-600', to: 'to-green-600', lightFrom: 'hover:from-emerald-50', lightTo: 'hover:to-green-50', badgeFrom: 'from-emerald-100', badgeTo: 'to-green-100', badgeText: 'text-emerald-800', border: 'border-emerald-400' },
  { from: 'from-purple-600', to: 'to-fuchsia-600', lightFrom: 'hover:from-purple-50', lightTo: 'hover:to-fuchsia-50', badgeFrom: 'from-purple-100', badgeTo: 'to-fuchsia-100', badgeText: 'text-purple-800', border: 'border-purple-400' },
  { from: 'from-orange-500', to: 'to-amber-600', lightFrom: 'hover:from-orange-50', lightTo: 'hover:to-amber-50', badgeFrom: 'from-orange-100', badgeTo: 'to-amber-100', badgeText: 'text-orange-800', border: 'border-orange-400' },
  { from: 'from-cyan-600', to: 'to-sky-600', lightFrom: 'hover:from-cyan-50', lightTo: 'hover:to-sky-50', badgeFrom: 'from-cyan-100', badgeTo: 'to-sky-100', badgeText: 'text-cyan-800', border: 'border-cyan-400' },
  { from: 'from-rose-600', to: 'to-pink-600', lightFrom: 'hover:from-rose-50', lightTo: 'hover:to-pink-50', badgeFrom: 'from-rose-100', badgeTo: 'to-pink-100', badgeText: 'text-rose-800', border: 'border-rose-400' },
]

function getColorScheme(key: string) {
  const sum = Array.from(key).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return COLOR_SCHEMES[sum % COLOR_SCHEMES.length]
}

export default function ProgramadoPage() {
  const notifications = useNotifications()
  const apiNotifications = createApiNotifications(notifications)
  
  const [programaciones, setProgramaciones] = useState<ProgramacionView[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [poolMoviles, setPoolMoviles] = useState<MovilDisponible[]>([])
  // Eliminado modal de edición en favor de drag & drop
  // Estados para drag & drop y cambios ya no son necesarios porque calculamos diferencias sobre programaciones
  const [isSavingChanges, setIsSavingChanges] = useState(false)
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({})
  const [estadisticasDistribucion, setEstadisticasDistribucion] = useState<{
    totalMoviles: number
    movilesAsignados: number
    movilesEnDescanso: number
    distribucion: Record<string, number>
    equidad: number
  } | null>(null)

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  async function fetchAll() {
    await Promise.all([fetchProgramaciones(), fetchMovilesDisponibles()])
  }

  async function fetchProgramaciones() {
    try {
      setIsLoading(true)
      const response = await axios.get(`/api/programado?fecha=${selectedDate}`)
      const list: Programacion[] = response.data.programaciones || []
      const view: ProgramacionView[] = list.map(p => ({
        id: p.id,
        fecha: p.fecha,
        ruta: p.ruta,
        hora: p.hora,
        usuarioId: p.usuarioId,
        disponible: p.disponible,
        originalMovilId: p.movil.id,
        currentMovil: { id: p.movil.id, movil: p.movil.movil, placa: p.movil.placa }
      }))
      setProgramaciones(view)
      
      // Calcular estadísticas de distribución
      calcularEstadisticasDistribucion(view)
    } catch {
      apiNotifications.fetchError('programaciones')
    } finally {
      setIsLoading(false)
    }
  }

  function calcularEstadisticasDistribucion(programaciones: ProgramacionView[]) {
    if (programaciones.length === 0) {
      setEstadisticasDistribucion(null)
      return
    }

    // Contar asignaciones por móvil
    const distribucion: Record<string, number> = {}
    const movilesAsignados = new Set<number>()
    
    programaciones.forEach(p => {
      if (p.currentMovil) {
        const movilId = p.currentMovil.id.toString()
        distribucion[movilId] = (distribucion[movilId] || 0) + 1
        movilesAsignados.add(p.currentMovil.id)
      }
    })

    // Obtener total de móviles disponibles
    const totalMoviles = poolMoviles.length + movilesAsignados.size
    const movilesEnDescanso = totalMoviles - movilesAsignados.size

    // Calcular índice de equidad (0-100)
    const asignaciones = Object.values(distribucion)
    const promedio = asignaciones.reduce((sum, count) => sum + count, 0) / asignaciones.length
    const varianza = asignaciones.reduce((sum, count) => sum + Math.pow(count - promedio, 2), 0) / asignaciones.length
    const desviacionEstandar = Math.sqrt(varianza)
    const equidad = Math.max(0, 100 - (desviacionEstandar / promedio) * 100)

    setEstadisticasDistribucion({
      totalMoviles,
      movilesAsignados: movilesAsignados.size,
      movilesEnDescanso,
      distribucion,
      equidad: Math.round(equidad)
    })
  }

  async function generarProgramacion() {
    try {
      setIsGenerating(true)
      const response = await axios.post('/api/programado/generar', { fecha: selectedDate })
      apiNotifications.createSuccess('Programación')
      
      // Mostrar estadísticas de distribución si están disponibles
      if (response.data.estadisticas) {
        const stats = response.data.estadisticas
        const distribucion = Object.entries(stats.distribucion)
          .map(([movilId, count]) => `Móvil ${movilId}: ${count} rutas`)
          .join(', ')
        
        
      }
      
      fetchAll()
    } catch {
      apiNotifications.createError('programación')
    } finally {
      setIsGenerating(false)
    }
  }

  async function eliminarProgramacion() {
    try {
      setIsDeleting(true)
      await axios.delete(`/api/programado/eliminar?fecha=${selectedDate}`)
      apiNotifications.deleteSuccess('Programación')
      fetchAll()
    } catch {
      apiNotifications.deleteError('programación')
    } finally {
      setIsDeleting(false)
    }
  }

  async function fetchMovilesDisponibles() {
    try {
      const response = await axios.get(`/api/programado/moviles-disponibles?fecha=${selectedDate}`)
      setPoolMoviles(response.data.moviles || [])
      
      // Recalcular estadísticas cuando se actualicen los móviles disponibles
      if (programaciones.length > 0) {
        calcularEstadisticasDistribucion(programaciones)
      }
    } catch (error) {
      console.error('Error al obtener móviles disponibles:', error)
    }
  }

  // Edición por modal eliminada

  // Guardar por modal eliminado; se usa Guardar Cambios general

  async function toggleDisponible(programacion: { id: number; disponible: boolean }) {
    try {
      await axios.put(`/api/programado/${programacion.id}`, {
        disponible: !programacion.disponible
      })
      apiNotifications.updateSuccess('Estado de programación')
      fetchAll()
    } catch {
      apiNotifications.updateError('estado de programación')
    }
  }

  function formatHora(hora: string) {
    try {
      const str = String(hora)
      // Si viene en ISO (contiene 'T'), tomar UTC, restar 5h y formatear HH:mm
      if (str.includes('T')) {
        const d = new Date(str)
        if (!isNaN(d.getTime())) {
          const base = new Date(Date.UTC(1970, 0, 1, d.getUTCHours(), d.getUTCMinutes(), 0, 0))
          const col = new Date(base.getTime() - 5 * 60 * 60 * 1000)
          const hh = String(col.getUTCHours()).padStart(2, '0')
          const mm = String(col.getUTCMinutes()).padStart(2, '0')
          return `${hh}:${mm} am`
        }
      }
      // Si viene como HH:MM, devolver con sufijo
      if (/^\d{1,2}:\d{2}$/.test(str)) {
        const [hh, mm] = str.split(':')
        return `${hh.padStart(2, '0')}:${mm} am`
      }
      // Si viene como HMM o HHMM
      const digits = str.replace(/\D/g, '')
      if (digits.length === 3) {
        const h = digits.slice(0, 1)
        const m = digits.slice(1)
        return `${h.padStart(2, '0')}:${m} am`
      }
      if (digits.length >= 4) {
        const d4 = digits.slice(-4)
        const h = d4.slice(0, 2)
        const m = d4.slice(2)
        return `${h}:${m} am`
      }
      return `${str} am`
    } catch {
      return `${hora} am`
    }
  }

  function getTotalRutas() {
    return Object.values(RUTAS_HORARIOS).reduce((total, horarios) => total + horarios.length, 0)
  }

  function getRutasSinAsignar() {
    return getTotalRutas() - programaciones.length
  }

  function groupByDespacho() {
    const grouped: { [key: string]: ProgramacionView[] } = {}
    
    programaciones.forEach(programacion => {
      if (!grouped[programacion.ruta]) {
        grouped[programacion.ruta] = []
      }
      grouped[programacion.ruta].push(programacion)
    })

    return grouped
  }

  const programacionesAgrupadas = groupByDespacho()

  // Helpers para el pool: deduplicar por id y excluir móviles actualmente asignados
  function dedupeById(list: MovilDisponible[]): MovilDisponible[] {
    const map = new Map<number, MovilDisponible>()
    for (const item of list) {
      map.set(item.id, item)
    }
    return Array.from(map.values())
  }

  const assignedMobileIds = useMemo(() => {
    const ids = new Set<number>()
    for (const p of programaciones) {
      if (p.currentMovil) ids.add(p.currentMovil.id)
    }
    return ids
  }, [programaciones])

  const visiblePoolMoviles = useMemo(() => {
    return dedupeById(poolMoviles).filter(m => !assignedMobileIds.has(m.id))
  }, [poolMoviles, assignedMobileIds])

  // Drag & Drop helpers (mover solo el chip del móvil)
  function handleDragStartFromSlot(event: React.DragEvent<HTMLDivElement>, programacionId: number) {
    const source = programaciones.find(p => p.id === programacionId)
    if (!source || !source.currentMovil) return
    const payload = JSON.stringify({ type: 'slot', programacionId, mobileId: source.currentMovil.id })
    event.dataTransfer.setData('application/json', payload)
    event.dataTransfer.effectAllowed = 'move'
  }

  function handleDragStartFromPool(event: React.DragEvent<HTMLDivElement>, mobileId: number) {
    const payload = JSON.stringify({ type: 'pool', mobileId })
    event.dataTransfer.setData('application/json', payload)
    event.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDropOnItem(event: React.DragEvent<HTMLDivElement>, targetProgramacionId: number) {
    event.preventDefault()
    const dataString = event.dataTransfer.getData('application/json')
    if (!dataString) return
    const data = JSON.parse(dataString) as { type: 'slot' | 'pool'; programacionId?: number; mobileId: number }

    if (data.type === 'slot') {
      const sourceId = data.programacionId!
      if (!sourceId || sourceId === targetProgramacionId) return
      setProgramaciones(prev => {
        const next = prev.map(p => ({ ...p }))
        const source = next.find(p => p.id === sourceId)
        const target = next.find(p => p.id === targetProgramacionId)
        if (!source || !target || !source.currentMovil) return prev
        const temp = source.currentMovil
        source.currentMovil = target.currentMovil
        target.currentMovil = temp
        
        // Recalcular estadísticas después del cambio
        setTimeout(() => calcularEstadisticasDistribucion(next), 0)
        return next
      })
    } else if (data.type === 'pool') {
      const mobileFromPoolId = data.mobileId
      setProgramaciones(prev => {
        const next = prev.map(p => ({ ...p }))
        const target = next.find(p => p.id === targetProgramacionId)
        if (!target) return prev
        const replaced = target.currentMovil
        const fromPool = poolMoviles.find(m => m.id === mobileFromPoolId) || null
        target.currentMovil = fromPool
        setPoolMoviles(pool => {
          const remaining = pool.filter(m => m.id !== mobileFromPoolId)
          const nextPool = replaced ? [...remaining, { id: replaced.id, movil: replaced.movil, placa: replaced.placa }] : remaining
          return dedupeById(nextPool)
        })
        
        // Recalcular estadísticas después del cambio
        setTimeout(() => calcularEstadisticasDistribucion(next), 0)
        return next
      })
    }
  }

  function handleDropOnPool(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const dataString = event.dataTransfer.getData('application/json')
    if (!dataString) return
    const data = JSON.parse(dataString) as { type: 'slot'; programacionId: number; mobileId: number }
    if (data.type !== 'slot') return
    setProgramaciones(prev => {
      const next = prev.map(p => ({ ...p }))
      const source = next.find(p => p.id === data.programacionId)
      if (!source || !source.currentMovil) return prev
      const moved = source.currentMovil
      source.currentMovil = null
      setPoolMoviles(pool => dedupeById([...pool, { id: moved.id, movil: moved.movil, placa: moved.placa }]))
      
      // Recalcular estadísticas después del cambio
      setTimeout(() => calcularEstadisticasDistribucion(next), 0)
      return next
    })
  }

  function hasEmptySlots() {
    return programaciones.some(p => !p.currentMovil)
  }

  function getPendingCount() {
    return programaciones.filter(p => (p.currentMovil ? p.currentMovil.id : -1) !== p.originalMovilId).length
  }

  async function savePendingChanges() {
    const changes = programaciones.filter(p => (p.currentMovil ? p.currentMovil.id : -1) !== p.originalMovilId)
    if (changes.length === 0) return
    
    console.log('🔍 Guardando cambios:', {
      totalChanges: changes.length,
      changes: changes.map(c => ({
        id: c.id,
        ruta: c.ruta,
        originalMovilId: c.originalMovilId,
        currentMovilId: c.currentMovil?.id || null,
        isRemoval: c.originalMovilId !== -1 && !c.currentMovil
      }))
    })
    
    // Verificar si hay slots vacíos que NO son parte de los cambios (es decir, slots que ya estaban vacíos)
    const emptySlots = programaciones.filter(p => !p.currentMovil)
    const changesWithEmptySlots = changes.filter(p => !p.currentMovil)
    
    console.log('🔍 Análisis de slots vacíos:', {
      totalEmptySlots: emptySlots.length,
      emptySlotsFromChanges: changesWithEmptySlots.length,
      emptySlots: emptySlots.map(s => ({ id: s.id, ruta: s.ruta, originalMovilId: s.originalMovilId }))
    })
    
    // Si hay slots vacíos que NO están en los cambios, significa que ya estaban vacíos originalmente
    const slotsThatWereAlreadyEmpty = emptySlots.filter(emptySlot => 
      !changesWithEmptySlots.some(change => change.id === emptySlot.id)
    )
    
    console.log('🔍 Slots que ya estaban vacíos:', {
      count: slotsThatWereAlreadyEmpty.length,
      slots: slotsThatWereAlreadyEmpty.map(s => ({ id: s.id, ruta: s.ruta }))
    })
    
    if (slotsThatWereAlreadyEmpty.length > 0) {
      notifications.error('Hay horarios sin móvil. Asigna todos antes de guardar.')
      return
    }
    
    try {
      setIsSavingChanges(true)
      
      // Procesar cambios: asignaciones y eliminaciones
      await Promise.all(changes.map(async p => {
        if (p.currentMovil) {
          // Asignar móvil
          await axios.put(`/api/programado/${p.id}`, { 
            movilId: p.currentMovil.id,
            disponible: false // Marcar como no disponible cuando se asigna
          })
        } else {
          // Eliminar móvil (hacer disponible)
          await axios.put(`/api/programado/${p.id}`, { 
            movilId: -1,
            disponible: true // Marcar como disponible cuando se elimina
          })
        }
      }))
      
      apiNotifications.updateSuccess('Cambios de programación')
      await fetchAll()
    } catch (error) {
      console.error('Error guardando cambios:', error)
      apiNotifications.updateError('cambios de programación')
    } finally {
      setIsSavingChanges(false)
    }
  }

  // toggleCard integrado directamente en el onClick de cada CardHeader

  const resetCambios = () => {
    fetchProgramaciones()
  }

  // Función para exportar a Excel
  const exportarAExcel = async () => {
    if (programaciones.length === 0) {
      notifications.error('No hay programaciones para exportar')
      return
    }

    // Importación dinámica para evitar problemas de SSR
    const ExcelJS = await import('exceljs')

    // Crear el libro y la hoja
    const workbook = new ExcelJS.Workbook()
    const hojaNombre = `Programacion ${selectedDate.split('-').reverse().join('-')}`
    const worksheet = workbook.addWorksheet(hojaNombre)

    // Formatear fecha para el título (usar cadena YYYY-MM-DD sin zonas horarias)
    const [yyyyStr, mmStr, ddStr] = selectedDate.split('-')
    const yyyy = Number(yyyyStr)
    const mmIndex = Number(mmStr) - 1
    const dd = Number(ddStr)
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const tituloFecha = `Programación ${dd} ${meses[Math.max(0, Math.min(11, mmIndex))]} ${yyyy}`

    // Título principal
    worksheet.mergeCells(1, 1, 1, 2)
    const tituloCell = worksheet.getCell(1, 1)
    tituloCell.value = tituloFecha
    tituloCell.font = { bold: true, size: 14 }

    let currentRow = 3 // fila donde comienzan las tablas

    // Agrupar programaciones por despacho/ruta
    const programacionesPorDespacho = programaciones.reduce((acc, prog) => {
      if (!acc[prog.ruta]) acc[prog.ruta] = []
      acc[prog.ruta].push(prog)
      return acc
    }, {} as Record<string, typeof programaciones>)

    // Helpers de hora: parsear 'HH:MM' o 'HHMM', convertir de UTC a Colombia y formatear 'HH:mm'
    const parseHHMM = (raw: string): { h: number; m: number } | null => {
      if (!raw) return null
      let str = String(raw).trim()
      // ISO 8601 como '2025-08-10T09:55:00.000Z'
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?\.\d{3}Z$/.test(str) || /T/.test(str)) {
        const d = new Date(str)
        if (!isNaN(d.getTime())) {
          // Tomar hora/min en UTC y luego restar 5 horas al convertir más adelante
          return { h: d.getUTCHours(), m: d.getUTCMinutes() }
        }
      }
      if (str.includes(':')) {
        const [hh, mm] = str.split(':')
        const h = Number(hh)
        const m = Number(mm)
        return Number.isFinite(h) && Number.isFinite(m) ? { h, m } : null
      }
      // Formatos como '935' o '0935' o '1130'
      const digits = str.replace(/\D/g, '')
      if (digits.length === 3) {
        const h = Number(digits.slice(0, 1))
        const m = Number(digits.slice(1))
        return Number.isFinite(h) && Number.isFinite(m) ? { h, m } : null
      }
      if (digits.length >= 4) {
        const d = digits.slice(-4) // tomar los últimos 4
        const h = Number(d.slice(0, 2))
        const m = Number(d.slice(2))
        return Number.isFinite(h) && Number.isFinite(m) ? { h, m } : null
      }
      return null
    }

    const toHoraColombia = (raw: string) => {
      const hm = parseHHMM(raw)
      if (!hm) return String(raw)
      try {
        const base = new Date(Date.UTC(1970, 0, 1, hm.h, hm.m, 0, 0))
        const col = new Date(base.getTime() - 5 * 60 * 60 * 1000)
        const hh = String(col.getUTCHours()).padStart(2, '0')
        const mm = String(col.getUTCMinutes()).padStart(2, '0')
        return `${hh}:${mm} am`
      } catch {
        return `${String(hm.h).padStart(2, '0')}:${String(hm.m).padStart(2, '0')} am`
      }
    }

    const toMinutesColombia = (raw: string) => {
      const hm = parseHHMM(raw)
      if (!hm) return Number.MAX_SAFE_INTEGER
      const base = new Date(Date.UTC(1970, 0, 1, hm.h, hm.m, 0, 0))
      const col = new Date(base.getTime() - 5 * 60 * 60 * 1000)
      return col.getUTCHours() * 60 + col.getUTCMinutes()
    }

    // Crear una tabla por despacho
    let tableIndex = 1
    for (const [despacho, progs] of Object.entries(programacionesPorDespacho)) {
      // Título del despacho
      worksheet.mergeCells(currentRow, 1, currentRow, 2)
      const dCell = worksheet.getCell(currentRow, 1)
      dCell.value = despacho
      dCell.font = { bold: true }
      currentRow += 2

      // Datos ordenados por hora (considerando conversión a Colombia)
      const filas = progs
        .slice()
        .sort((a, b) => toMinutesColombia(a.hora) - toMinutesColombia(b.hora))
        .map(p => [toHoraColombia(p.hora), p.currentMovil ? p.currentMovil.movil : 'Sin asignar'])

      // Definir rango inicial de la tabla
      const ref = `A${currentRow}`
      const tableName = `Tabla_${tableIndex}_${despacho.replace(/[^A-Za-z0-9_]/g, '_')}`.slice(0, 30)

      worksheet.addTable({
        name: tableName,
        ref,
        headerRow: true,
        style: {
          theme: 'TableStyleMedium2',
          showRowStripes: true,
        },
        columns: [
          { name: 'Hora de Salida' },
          { name: 'Móvil' },
        ],
        rows: filas,
      })

      // Centrar contenido de la tabla (encabezados y datos)
      const headerRow = currentRow
      const dataStart = currentRow + 1
      const dataEnd = currentRow + filas.length
      for (let r = headerRow; r <= dataEnd; r++) {
        for (let c = 1; c <= 2; c++) {
          const cell = worksheet.getCell(r, c)
          cell.alignment = { horizontal: 'center' }
        }
      }

      // Mover el puntero de fila: header + filas
      currentRow += filas.length + 3 // deja una fila vacía entre tablas
      tableIndex += 1
    }

    // Autoajustar el ancho de columnas (A y B) según el contenido máximo
    const colMax = [0, 0]
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const val = cell.value == null ? '' : String(cell.value)
        const len = val.length
        if (colNumber >= 1 && colNumber <= 2) {
          colMax[colNumber - 1] = Math.max(colMax[colNumber - 1], len)
        }
      })
    })
    worksheet.getColumn(1).width = Math.max(12, colMax[0] + 2)
    worksheet.getColumn(2).width = Math.max(10, colMax[1] + 2)

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Programacion_${selectedDate.replace(/-/g, '_')}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    notifications.success('Archivo Excel descargado exitosamente')
  }

  return (
    <RouteGuard requiredPermission="tablaProgramada">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header mejorado */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-lg">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Programación de Rutas
                  </h1>
                  <p className="text-gray-600 flex items-center gap-2 mt-1">
                    <Info className="w-4 h-4" />
                    Arrastra los móviles entre horarios para reorganizar
                  </p>
                  
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/90 backdrop-blur-sm shadow-sm"
                  />
                </div>
                
                <Button
                  onClick={generarProgramacion}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2 rounded-xl"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generar
                    </>
                  )}
                </Button>
                
                {programaciones.length > 0 && (
                  <Button
                    onClick={eliminarProgramacion}
                    disabled={isDeleting}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2 rounded-xl"
                  >
                    {isDeleting ? (
                      <>
                        <Trash2 className="w-4 h-4 mr-2 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={savePendingChanges}
                  disabled={isSavingChanges || getPendingCount() === 0}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2 rounded-xl"
                >
                  {isSavingChanges ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Guardar ({getPendingCount()})
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={resetCambios}
                  className="border-gray-200 bg-white/90 backdrop-blur-sm hover:bg-gray-50 shadow-sm rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" />
                  Deshacer
                </Button>
                
                {programaciones.length > 0 && (
                  <Button
                    onClick={exportarAExcel}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-2 rounded-xl"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
          {/* Cards de estadísticas mejoradas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total de Rutas</p>
                    <p className="text-3xl font-bold text-gray-900">{getTotalRutas()}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Rutas Asignadas</p>
                    <p className="text-3xl font-bold text-emerald-600">{programaciones.length}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                    <Car className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Sin Asignar</p>
                    <p className="text-3xl font-bold text-orange-600">{getRutasSinAsignar()}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
           
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl mb-4">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              </div>
              <p className="text-lg font-medium text-gray-700">Cargando programación...</p>
              <p className="text-gray-500">Un momento por favor</p>
            </div>
          ) : programaciones.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <CardContent className="p-12 text-center">
                <div className="p-4 rounded-2xl bg-gray-100 inline-block mb-4">
                  <Calendar className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay programación disponible</h3>
                <p className="text-gray-600 mb-6">Genera una nueva programación para la fecha seleccionada.</p>
                <Button
                  onClick={generarProgramacion}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generar Programación
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="columns-1 md:columns-3 gap-4 [column-fill:_balance]">
              {Object.entries(programacionesAgrupadas).map(([despacho, rutas]) => {
                const colors = getColorScheme(despacho)
                return (
                <Card key={despacho} className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl mb-4 break-inside-avoid overflow-hidden">
                  <CardHeader 
                    className={`cursor-pointer hover:bg-gradient-to-r ${colors.lightFrom} ${colors.lightTo} transition-all duration-200 p-4`} 
                    onClick={() => setOpenCards(prev => ({...prev, [despacho]: !(prev[despacho] ?? true)}))}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-gray-900">
                        <span className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} text-white text-xs font-bold shadow`}>
                            {despacho.charAt(0)}
                          </span>
                          <span className="truncate">{despacho}</span>
                        </span>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={`bg-gradient-to-r ${colors.badgeFrom} ${colors.badgeTo} ${colors.badgeText} font-semibold px-2 py-0.5 rounded-lg text-xs`}>
                          {rutas.length}
                        </Badge>
                        {(openCards[despacho] ?? true) ? (
                          <ChevronDown className="w-5 h-5 text-gray-600 transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600 transition-transform duration-200" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {(openCards[despacho] ?? true) && (
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                        {rutas.map((programacion) => (
                          <div
                            key={programacion.id}
                        className={`p-2 rounded-xl border transition-all duration-200 ${
                              programacion.disponible 
                                ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300' 
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnItem(e, programacion.id)}
                          >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-600" />
                            <span className="font-semibold text-gray-900 text-sm">
                                  {formatHora(programacion.hora)}
                                </span>
                              </div>
                          <div className="flex items-center gap-1">
                            <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleDisponible(programacion)}
                              className={`p-1 h-6 w-6 rounded-lg ${
                                    programacion.disponible 
                                      ? 'text-emerald-600 hover:bg-emerald-100' 
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  {programacion.disponible ? (
                                <Check className="w-3 h-3" />
                                  ) : (
                                    <X className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            
                        {/* Zona de móvil compacta */}
                        <div className="rounded-lg border border-dashed border-gray-300 p-2 bg-white/60 flex items-center justify-center">
                              {programacion.currentMovil ? (
                                <div
                              className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-blue-600 text-white cursor-move"
                                  draggable
                                  onDragStart={(e) => handleDragStartFromSlot(e, programacion.id)}
                              title={`Móvil ${programacion.currentMovil.movil} - Arrastra para reubicar`}
                                >
                                  <Car className="w-4 h-4" />
                              <span className="text-xs font-medium">
                                    {programacion.currentMovil.movil} 
                                    <span className="opacity-90 ml-1">({programacion.currentMovil.placa})</span>
                                  </span>
                                  <button
                                className="ml-2 p-1 rounded hover:bg-white/20"
                                    onClick={(ev) => {
                                      ev.stopPropagation()
                                      const sourceId = programacion.id
                                      setProgramaciones(prev => prev.map(p => p.id === sourceId ? { ...p, currentMovil: null } : p))
                                      setPoolMoviles(pool => dedupeById([...pool, { id: programacion.currentMovil!.id, movil: programacion.currentMovil!.movil, placa: programacion.currentMovil!.placa }]))
                                    }}
                                    aria-label="Liberar móvil"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                            <div className="text-xs text-gray-500 italic p-1 text-center">
                              <Car className="w-4 h-4 mx-auto mb-1 opacity-50" />
                                  Arrastra un móvil aquí
                                </div>
                              )}
                            </div>
                            
                            {programacion.disponible && (
                              <div className="mt-3">
                                <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 shadow-sm">
                                  <Check className="w-3 h-3 mr-1" />
                                  Disponible
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )})}
              
              {/* Panel de móviles disponibles mejorado */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl mb-6 overflow-hidden">
                <CardHeader className="p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg">
                        <Settings className="w-5 h-5" />
                      </div>
                      Móviles Disponibles
                    </CardTitle>
                    <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 font-semibold px-3 py-1 rounded-xl">
                      {visiblePoolMoviles.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div
                    className="rounded-2xl border-2 border-dashed border-purple-300 p-6 min-h-[120px] bg-gradient-to-r from-purple-50/50 to-pink-50/50 transition-all duration-200 hover:border-purple-400 hover:bg-gradient-to-r hover:from-purple-100/50 hover:to-pink-100/50"
                    onDragOver={handleDragOver}
                    onDrop={handleDropOnPool}
                  >
                    {visiblePoolMoviles.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="p-3 rounded-2xl bg-purple-100 inline-block mb-3">
                          <Car className="w-6 h-6 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">No hay móviles disponibles</p>
                        <p className="text-xs text-gray-500 mt-1">Los móviles liberados aparecerán aquí</p>
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {visiblePoolMoviles.map(movil => (
                          <div
                            key={movil.id}
                            className="inline-flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 cursor-move hover:shadow-lg hover:scale-105 transition-all duration-200 hover:border-purple-300"
                            draggable
                            onDragStart={(e) => handleDragStartFromPool(e, movil.id)}
                            title={`Móvil ${movil.movil} - Arrastra a un horario`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                                <Car className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-semibold text-gray-900">{movil.movil}</span>
                                <span className="text-gray-600 ml-2 text-sm">({movil.placa})</span>
                              </div>
                            </div>
                            <GripVertical className="w-4 h-4 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Modal eliminado: la edición se realiza solo por drag & drop */}
        </div>
      </div>
    </RouteGuard>
  )
}