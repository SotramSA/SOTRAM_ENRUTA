import { PrismaClient } from '@prisma/client';

class PrismaClientWithRetry extends PrismaClient {
  private currentDatabaseUrl: string;
  private databaseUrls: string[];
  private clientsByUrl: Map<string, PrismaClient>;

  constructor() {
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
    this.clientsByUrl = new Map<string, PrismaClient>();
    this.clientsByUrl.set(primaryUrl!, this);
    
    console.log(`🔗 Configuradas ${this.databaseUrls.length} URLs de base de datos`);
    
    if (secondaryUrl && secondaryUrl !== '[IP_MOVISTAR]') {
      const secondaryClient = new PrismaClient({
        log: ['query'],
        datasources: {
          db: { url: secondaryUrl }
        }
      });
      this.clientsByUrl.set(secondaryUrl, secondaryClient);
    }
  }

  private async switchToNextDatabase(): Promise<boolean> {
    const currentIndex = this.databaseUrls.indexOf(this.currentDatabaseUrl);
    const nextIndex = (currentIndex + 1) % this.databaseUrls.length;
    
    if (nextIndex === currentIndex) {
      return false;
    }
    
    const nextUrl = this.databaseUrls[nextIndex];
    console.log(`🔄 Cambiando de base de datos: ${this.currentDatabaseUrl} -> ${nextUrl}`);
    
    try {
      await this.$disconnect();
      let nextClient = this.clientsByUrl.get(nextUrl!);
      if (!nextClient) {
        nextClient = new PrismaClient({
          log: ['query'],
          datasources: { db: { url: nextUrl } }
        });
        this.clientsByUrl.set(nextUrl!, nextClient);
      }
      await nextClient.$connect();
      this.currentDatabaseUrl = nextUrl;
      Object.setPrototypeOf(this, Object.getPrototypeOf(nextClient));
      Object.assign(this, nextClient);
      console.log(`✅ Conexión exitosa con: ${nextUrl}`);
      return true;
    } catch (error: unknown) {
      const maybeMsg = (error as { message?: unknown })?.message;
      const msg = typeof maybeMsg === 'string' ? maybeMsg : String(error);
      console.log(`❌ Falló conexión con: ${nextUrl} ${msg}`);
      return false;
    }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | undefined;
    let hasTriedFailover = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = (error instanceof Error) ? error : new Error(String(error));
        const maybeMsg = (error as { message?: unknown })?.message;
        const msg = typeof maybeMsg === 'string' ? maybeMsg : String(error);
        console.log(`❌ Error en intento ${attempt}/${maxRetries}:`, msg);
        const isConnectionError = this.isConnectionError(error);
        
        if (isConnectionError && !hasTriedFailover && this.databaseUrls.length > 1) {
          console.log('🔄 Intentando cambiar a base de datos alternativa...');
          
          const switched = await this.switchToNextDatabase();
          if (switched) {
            hasTriedFailover = true;
            attempt = 0;
            maxRetries = 3;
            continue;
          }
        }
        
        if (isConnectionError && attempt < maxRetries) {
          console.log(`🔄 Reintentando en ${1000 * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        if (attempt >= maxRetries) {
          console.log('❌ Se agotaron todos los intentos de reconexión');
          throw lastError;
        }
      }
    }
    
    throw lastError!;
  }

  private isConnectionError(error: unknown): boolean {
    const connectionErrorCodes = [
      'P1017',
      'P1001',
      'P1008',
      'P1009',
      'P1010',
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
    
    if (error && typeof error === 'object') {
      const codeVal = (error as { code?: unknown }).code;
      if (typeof codeVal === 'string' && connectionErrorCodes.includes(codeVal)) {
        return true;
      }
      const msgVal = (error as { message?: unknown }).message;
      if (typeof msgVal === 'string') {
        return connectionErrorMessages.some(msg =>
          msgVal.toLowerCase().includes(msg.toLowerCase())
        );
      }
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
