import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Función utilitaria para combinar clases de CSS de manera segura
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utilidades para el manejo de fechas
 */

/**
 * Formatea una fecha de manera consistente sin problemas de zona horaria
 * @param dateString - Fecha en formato string (YYYY-MM-DD o ISO string)
 * @param locale - Locale para formatear la fecha (default: 'es-ES')
 * @returns Fecha formateada en el locale especificado
 */
export const formatDate = (dateString: string, locale: string = 'es-ES'): string => {
  // Si la fecha ya está en formato YYYY-MM-DD, usarla directamente
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-')
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString(locale)
  }
  
  // Si tiene timestamp, extraer solo la fecha
  const dateOnly = dateString.split('T')[0]
  const [year, month, day] = dateOnly.split('-')
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString(locale)
}

/**
 * Convierte una fecha ISO a formato YYYY-MM-DD para inputs de tipo date
 * @param dateString - Fecha en formato ISO string
 * @returns Fecha en formato YYYY-MM-DD
 */
export const formatDateForInput = (dateString: string): string => {
  return dateString.split('T')[0]
}

/**
 * Formatea una fecha Date a formato YYYY-MM-DD de manera consistente
 * @param date - Objeto Date
 * @returns Fecha en formato YYYY-MM-DD
 */
export const formatDateToYYYYMMDD = (date: Date): string => {
  const año = date.getFullYear()
  const mes = (date.getMonth() + 1).toString().padStart(2, '0')
  const dia = date.getDate().toString().padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

/**
 * Formatea una fecha Date a formato YYYY-MM-DD sin problemas de zona horaria
 * @param date - Objeto Date
 * @returns Fecha en formato YYYY-MM-DD
 */
export const formatDateToYYYYMMDDNoTimezone = (date: Date): string => {
  // Usar UTC para evitar problemas de zona horaria
  const año = date.getUTCFullYear()
  const mes = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const dia = date.getUTCDate().toString().padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

/**
 * Formatea una fecha Date a formato YYYY-MM-DD usando métodos locales (más simple)
 * @param date - Objeto Date
 * @returns Fecha en formato YYYY-MM-DD
 */
export const formatDateToYYYYMMDDLocal = (date: Date): string => {
  // Usar métodos locales que son más consistentes
  const año = date.getFullYear()
  const mes = (date.getMonth() + 1).toString().padStart(2, '0')
  const dia = date.getDate().toString().padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

/**
 * Crea una fecha Date a partir de año, mes y día sin problemas de zona horaria
 * @param año - Año
 * @param mes - Mes (0-11)
 * @param dia - Día
 * @returns Objeto Date
 */
export const createDateFromComponentsNoTimezone = (año: number, mes: number, dia: number): Date => {
  // Crear fecha usando UTC para evitar problemas de zona horaria
  return new Date(Date.UTC(año, mes, dia))
}

/**
 * Crea una fecha Date a partir de año, mes y día usando métodos locales (más simple)
 * @param año - Año
 * @param mes - Mes (0-11)
 * @param dia - Día
 * @returns Objeto Date
 */
export const createDateFromComponentsLocal = (año: number, mes: number, dia: number): Date => {
  // Crear fecha usando métodos locales
  return new Date(año, mes, dia)
}

/**
 * Obtiene el primer día del mes actual
 * @returns Date object del primer día del mes actual
 */
export const getFirstDayOfCurrentMonth = (): Date => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Obtiene el nombre del mes en español
 * @param date - Objeto Date
 * @returns Nombre del mes en español con año
 */
export const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

/**
 * Verifica si una fecha está dentro de un rango de fechas
 * @param date - Fecha a verificar
 * @param startDate - Fecha de inicio del rango
 * @param endDate - Fecha de fin del rango
 * @returns true si la fecha está dentro del rango
 */
export const isDateInRange = (date: string, startDate: string, endDate: string): boolean => {
  const dateObj = new Date(date)
  const startObj = new Date(startDate)
  const endObj = new Date(endDate)
  
  return dateObj >= startObj && dateObj <= endObj
}

/**
 * Convierte una fecha/hora ISO a formato HH:mm usando UTC para evitar problemas de zonas horarias
 * @param isoString - Cadena ISO, por ejemplo: "2025-09-30T14:35:00.000Z"
 * @returns Hora en formato 24h HH:mm, por ejemplo: "14:35"
 */
export const isoToTimeHHMM = (isoString: string): string => {
  const date = new Date(isoString);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * @returns Fecha actual en formato YYYY-MM-DD
 */
export const getCurrentDate = (): string => {
  const today = new Date()
  return formatDateToYYYYMMDD(today)
}

/**
 * Función de utilidad para hacer llamadas fetch con manejo robusto de errores
 */
export async function safeFetch(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, options);
    
    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Verificar que el contenido sea JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('La respuesta no es JSON válido');
    }
    
    // Intentar parsear JSON
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`Error en fetch a ${url}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}