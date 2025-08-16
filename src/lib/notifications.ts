import { useToast } from '@/src/components/ui/Toast'

// Hook para usar notificaciones en componentes
export const useNotifications = () => {
  const { addToast } = useToast()
  
  return {
    success: (message: string, description?: string) => {
      addToast({
        type: 'success',
        message,
        description: description || 'Operación completada exitosamente'
      })
    },
    
    error: (message: string, description?: string) => {
      addToast({
        type: 'error',
        message,
        description: description || 'Ha ocurrido un error'
      })
    },
    
    warning: (message: string, description?: string) => {
      addToast({
        type: 'warning',
        message,
        description: description || 'Atención requerida'
      })
    },
    
    info: (message: string, description?: string) => {
      addToast({
        type: 'info',
        message,
        description: description || 'Información importante'
      })
    }
  }
}

// Funciones específicas para operaciones comunes
export const createApiNotifications = (notifications: ReturnType<typeof useNotifications>) => ({
  createSuccess: (entity: string) => notifications.success(`${entity} creado exitosamente`),
  updateSuccess: (entity: string) => notifications.success(`${entity} actualizado exitosamente`),
  deleteSuccess: (entity: string) => notifications.success(`${entity} eliminado exitosamente`),
  createError: (entity: string) => notifications.error(`Error al crear ${entity}`),
  updateError: (entity: string) => notifications.error(`Error al actualizar ${entity}`),
  deleteError: (entity: string) => notifications.error(`Error al eliminar ${entity}`),
  fetchError: (entity: string) => notifications.error(`Error al cargar ${entity}`),
})