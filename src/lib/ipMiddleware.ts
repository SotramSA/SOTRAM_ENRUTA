import { NextRequest } from 'next/server';

// Configuración de IPs autorizadas
export const IP_CONFIG = {
  CONDUCTORES: process.env.IP_CONDUCTORES || '192.168.1.100',
  CONDUCTORES_LOCAL: process.env.IP_CONDUCTORES_LOCAL || '127.0.0.1,::1',
  DESARROLLO: '127.0.0.1',
  LOCALHOST: '::1'
};

/**
 * Obtiene la IP real del cliente considerando proxies y load balancers
 */
export function getClientIP(request: NextRequest): string {
  // Headers comunes para obtener la IP real
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-vercel-forwarded-for',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip'
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for puede contener múltiples IPs separadas por comas
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }

  // Fallback para desarrollo local
  return IP_CONFIG.DESARROLLO;
}

/**
 * Valida si una IP está autorizada para el módulo de conductores
 */
export function isIPAutorizada(ip: string): boolean {
  // IPs principales
  const ipsAutorizadas = [
    IP_CONFIG.CONDUCTORES,
    IP_CONFIG.DESARROLLO,
    IP_CONFIG.LOCALHOST
  ];

  // Agregar IPs locales configuradas
  const ipsLocales = IP_CONFIG.CONDUCTORES_LOCAL.split(',').map(ip => ip.trim());
  ipsAutorizadas.push(...ipsLocales);

  return ipsAutorizadas.includes(ip);
}

/**
 * Middleware para validar IP en rutas específicas
 */
export function validateConductorIP(request: NextRequest): { 
  authorized: boolean; 
  ip: string; 
  error?: string 
} {
  const clientIP = getClientIP(request);
  const authorized = isIPAutorizada(clientIP);

  if (!authorized) {
    console.log(`🚫 Acceso denegado desde IP: ${clientIP} - IP autorizada: ${IP_CONFIG.CONDUCTORES}`);
    return {
      authorized: false,
      ip: clientIP,
      error: `Acceso no autorizado desde esta ubicación (${clientIP})`
    };
  }

  console.log(`✅ Acceso autorizado desde IP: ${clientIP}`);
  return {
    authorized: true,
    ip: clientIP
  };
}

/**
 * Función para logging de intentos de acceso
 */
export function logAccessAttempt(ip: string, authorized: boolean, endpoint: string) {
  const timestamp = new Date().toISOString();
  const status = authorized ? '✅ AUTORIZADO' : '🚫 DENEGADO';
  
  console.log(`[${timestamp}] ${status} - IP: ${ip} - Endpoint: ${endpoint}`);
  
  // Aquí podrías agregar logging a base de datos si es necesario
  // await prisma.accessLog.create({ data: { ip, authorized, endpoint, timestamp } });
}