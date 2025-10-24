import { getSession } from '@/src/lib/session'
import { cookies } from 'next/headers'

export default async function DebugSession() {
  const session = await getSession()
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  let rawSessionData = null
  if (sessionCookie) {
    try {
      rawSessionData = JSON.parse(sessionCookie.value)
    } catch (error) {
      console.error('Error parsing session cookie:', error)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug de Sesión</h1>
      
      <div className="grid gap-6">
        {/* Sesión procesada por getSession() */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-blue-600">
            Sesión procesada por getSession()
          </h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {session ? JSON.stringify(session, null, 2) : 'No hay sesión'}
          </pre>
        </div>

        {/* Cookie cruda */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-green-600">
            Cookie de sesión cruda
          </h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {rawSessionData ? JSON.stringify(rawSessionData, null, 2) : 'No hay cookie de sesión'}
          </pre>
        </div>

        {/* Verificación específica de tablaInspeccion */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-purple-600">
            Verificación de tablaInspeccion
          </h2>
          <div className="space-y-2">
            <p><strong>En sesión procesada:</strong> {session?.tablaInspeccion ? '✅ true' : '❌ false/undefined'}</p>
            <p><strong>En cookie cruda:</strong> {rawSessionData?.tablaInspeccion ? '✅ true' : '❌ false/undefined'}</p>
            <p><strong>Tipo en sesión:</strong> {typeof session?.tablaInspeccion}</p>
            <p><strong>Tipo en cookie:</strong> {typeof rawSessionData?.tablaInspeccion}</p>
          </div>
        </div>

        {/* Información de la cookie */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-orange-600">
            Información de la cookie
          </h2>
          <div className="space-y-2">
            <p><strong>Existe cookie:</strong> {sessionCookie ? '✅ Sí' : '❌ No'}</p>
            <p><strong>Valor de cookie:</strong> {sessionCookie?.value ? 'Presente' : 'Ausente'}</p>
            <p><strong>Tamaño de cookie:</strong> {sessionCookie?.value?.length || 0} caracteres</p>
          </div>
        </div>

        {/* Todas las propiedades de la sesión */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-red-600">
            Todas las propiedades de la sesión
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {session && Object.entries(session).map(([key, value]) => (
              <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">{key}:</span>
                <span className={value ? 'text-green-600' : 'text-red-600'}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}