'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface IPInfo {
  detectedIP: string;
  authorizedIP: string;
  isAuthorized: boolean;
  headers: Record<string, string>;
  error?: string;
}

export default function DebugIPPage() {
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const checkIP = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-ip');
      const data = await response.json();
      setIpInfo(data);
    } catch (error) {
      console.error('Error al verificar IP:', error);
      setIpInfo({
        detectedIP: 'Error',
        authorizedIP: 'Error',
        isAuthorized: false,
        headers: {},
        error: 'Error al conectar con el servidor'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkIP();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Diagnóstico de IP
          </h1>
          <p className="text-gray-600">
            Herramienta para diagnosticar problemas de autorización por IP
          </p>
        </div>

        {/* Información de IP */}
        <Card>
          <CardHeader>
            <CardTitle>Información de IP Detectada</CardTitle>
            <CardDescription>
              Detalles de la IP que está detectando el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p>Verificando IP...</p>
              </div>
            ) : ipInfo ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">IP Detectada</h3>
                    <p className="text-2xl font-mono text-blue-700">{ipInfo.detectedIP}</p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">IP Autorizada</h3>
                    <p className="text-2xl font-mono text-green-700">{ipInfo.authorizedIP}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${ipInfo.isAuthorized ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'}`}>
                  <h3 className={`font-semibold mb-2 ${ipInfo.isAuthorized ? 'text-green-900' : 'text-red-900'}`}>
                    Estado de Autorización
                  </h3>
                  <p className={`text-lg ${ipInfo.isAuthorized ? 'text-green-700' : 'text-red-700'}`}>
                    {ipInfo.isAuthorized ? '✅ AUTORIZADA' : '❌ NO AUTORIZADA'}
                  </p>
                  {ipInfo.error && (
                    <p className="text-red-600 mt-2">{ipInfo.error}</p>
                  )}
                </div>

                {!ipInfo.isAuthorized && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-semibold text-yellow-900 mb-2">💡 Posibles Soluciones</h3>
                    <ul className="text-yellow-800 space-y-1 text-sm">
                      <li>• Verifica que tu IP pública sea exactamente: <code className="bg-yellow-200 px-1 rounded">{ipInfo.authorizedIP}</code></li>
                      <li>• Si usas VPN, desconéctala temporalmente</li>
                      <li>• Si tu IP cambió, actualiza la variable <code className="bg-yellow-200 px-1 rounded">IP_CONDUCTORES</code> en .env.local</li>
                      <li>• Reinicia el servidor después de cambiar la configuración</li>
                    </ul>
                  </div>
                )}

                <Button onClick={checkIP} className="w-full">
                  🔄 Verificar IP Nuevamente
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No se pudo obtener información de IP
              </div>
            )}
          </CardContent>
        </Card>

        {/* Headers de red */}
        {ipInfo && Object.keys(ipInfo.headers).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Headers de Red</CardTitle>
              <CardDescription>
                Headers HTTP relacionados con la detección de IP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(ipInfo.headers).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-mono text-sm text-gray-600">{key}:</span>
                    <span className="font-mono text-sm text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instrucciones */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Instrucciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>1. Verifica tu IP pública:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Visita <a href="https://whatismyipaddress.com/" target="_blank" className="text-blue-600 underline">whatismyipaddress.com</a></li>
                <li>• Compara con la "IP Autorizada" mostrada arriba</li>
              </ul>
              
              <p><strong>2. Si las IPs no coinciden:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Actualiza <code className="bg-gray-200 px-1 rounded">IP_CONDUCTORES</code> en el archivo .env.local</li>
                <li>• Reinicia el servidor con <code className="bg-gray-200 px-1 rounded">npm run dev</code></li>
              </ul>

              <p><strong>3. Problemas comunes:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• VPN activa cambia tu IP</li>
                <li>• IP dinámica del proveedor de internet</li>
                <li>• Proxy o firewall corporativo</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}