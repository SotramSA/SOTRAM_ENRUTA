import { PrismaClient } from '@prisma/client';

class PrismaClientWithRetry extends PrismaClient {
  private currentDatabaseUrl: string;
  private databaseUrls: string[];

  constructor() {
    // Configurar las URLs de base de datos disponibles
    const primaryUrl = process.env.DATABASE_URL_PRIMARY || process.env.DATABASE_URL;
    const secondaryUrl = process.env.DATABASE_URL_SECONDARY;
    
    const urls = [primaryUrl];
    if (secondaryUrl && secondaryUrl !== '[IP_MOVISTAR]') {
      urls.push(secondaryUrl);
    }
    
    super({
      log: ['query'],
      datasources: {
        db: {
          url: primaryUrl,
        },
      },
    });

    this.currentDatabaseUrl = primaryUrl!;
    this.databaseUrls = urls as string[];
    
    console.log(`🔗 Configuradas ${this.databaseUrls.length} URLs de base de datos`);
  }

  // Método para cambiar la URL de conexión
  private async switchToNextDatabase(): Promise<boolean> {
    const currentIndex = this.databaseUrls.indexOf(this.currentDatabaseUrl);
    const nextIndex = (currentIndex + 1) % this.databaseUrls.length;
    
    if (nextIndex === currentIndex) {
      return false; // No hay más URLs para probar
    }
    
    const nextUrl = this.databaseUrls[nextIndex];
    console.log(`🔄 Cambiando de base de datos: ${this.currentDatabaseUrl} -> ${nextUrl}`);
    
    try {
      // Desconectar la instancia actual
      await this.$disconnect();
      
      // Crear nueva instancia con la nueva URL
      const newClient = new PrismaClient({
        log: ['query'],
        datasources: {
          db: {
            url: nextUrl,
          },
        },
      });
      
      // Probar la conexión
      await newClient.$connect();
      
      // Si llegamos aquí, la conexión fue exitosa
      this.currentDatabaseUrl = nextUrl;
      
      // Copiar las propiedades del nuevo cliente
      Object.setPrototypeOf(this, Object.getPrototypeOf(newClient));
      Object.assign(this, newClient);
      
      console.log(`✅ Conexión exitosa con: ${nextUrl}`);
      return true;
    } catch (error) {
      console.log(`❌ Falló conexión con: ${nextUrl}`, error);
      return false;
    }
  }

  // Método para ejecutar consultas con reintentos y failover
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    let hasTriedFailover = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        console.log(`❌ Error en intento ${attempt}/${maxRetries}:`, error.message);
        
        // Verificar si es un error de conexión que justifica cambiar de base de datos
        const isConnectionError = this.isConnectionError(error);
        
        if (isConnectionError && !hasTriedFailover && this.databaseUrls.length > 1) {
          console.log('🔄 Intentando cambiar a base de datos alternativa...');
          
          const switched = await this.switchToNextDatabase();
          if (switched) {
            hasTriedFailover = true;
            // Reiniciar el contador de intentos después del cambio exitoso
            attempt = 0;
            maxRetries = 3; // Dar 3 intentos más con la nueva conexión
            continue;
          }
        }
        
        // Si es un error de conexión normal, intentar reconectar
        if (isConnectionError && attempt < maxRetries) {
          console.log(`🔄 Reintentando en ${1000 * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        // Si no es un error de conexión o se agotaron los intentos, lanzar el error
        if (attempt >= maxRetries) {
          console.log('❌ Se agotaron todos los intentos de reconexión');
          throw error;
        }
      }
    }
    
    throw lastError!;
  }

  // Método para detectar errores de conexión
  private isConnectionError(error: any): boolean {
    const connectionErrorCodes = [
      'P1017', // Server has closed the connection
      'P1001', // Can't reach database server
      'P1008', // Operations timed out
      'P1009', // Database does not exist
      'P1010', // User access denied
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET'
    ];
    
    const connectionErrorMessages = [
      'Server has closed the connection',
      'Connection terminated',
      'connect ECONNREFUSED',
      'connect ETIMEDOUT',
      'getaddrinfo ENOTFOUND',
      'Connection lost',
      'Lost connection to MySQL server',
      'Connection refused',
      'Network is unreachable'
    ];
    
    // Verificar código de error
    if (error.code && connectionErrorCodes.includes(error.code)) {
      return true;
    }
    
    // Verificar mensaje de error
    if (error.message) {
      return connectionErrorMessages.some(msg => 
        error.message.toLowerCase().includes(msg.toLowerCase())
      );
    }
    
    return false;
  }
}

// Crear instancia global
declare global {
  var prismaWithRetry: PrismaClientWithRetry | undefined;
}

const prismaWithRetry = global.prismaWithRetry || new PrismaClientWithRetry();

if (process.env.NODE_ENV !== 'production') {
  global.prismaWithRetry = prismaWithRetry;
}

export default prismaWithRetry;
