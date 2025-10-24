import { NextRequest, NextResponse } from 'next/server';
import { getClientIP, IP_CONFIG, isIPAutorizada } from '@/src/lib/ipMiddleware';

export async function GET(request: NextRequest) {
  try {
    const detectedIP = getClientIP(request);
    const authorizedIP = IP_CONFIG.CONDUCTORES;
    const isAuthorized = isIPAutorizada(detectedIP);

    // Recopilar headers relevantes para diagnóstico
    const relevantHeaders: Record<string, string> = {};
    const headerNames = [
      'x-forwarded-for',
      'x-real-ip',
      'x-vercel-forwarded-for',
      'cf-connecting-ip',
      'x-client-ip',
      'user-agent',
      'host'
    ];

    headerNames.forEach(headerName => {
      const value = request.headers.get(headerName);
      if (value) {
        relevantHeaders[headerName] = value;
      }
    });

    // Log para debugging
    console.log('🔍 DEBUG IP - Información completa:');
    console.log('- IP Detectada:', detectedIP);
    console.log('- IP Autorizada:', authorizedIP);
    console.log('- ¿Autorizada?:', isAuthorized);
    console.log('- Headers relevantes:', relevantHeaders);

    return NextResponse.json({
      detectedIP,
      authorizedIP,
      isAuthorized,
      headers: relevantHeaders,
      timestamp: new Date().toISOString(),
      ...(isAuthorized ? {} : {
        error: `Tu IP (${detectedIP}) no coincide con la IP autorizada (${authorizedIP})`
      })
    });

  } catch (error) {
    console.error('Error en debug-ip:', error);
    return NextResponse.json({
      detectedIP: 'Error',
      authorizedIP: IP_CONFIG.CONDUCTORES,
      isAuthorized: false,
      headers: {},
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}