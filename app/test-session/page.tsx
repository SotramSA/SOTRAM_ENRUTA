'use client'

import { useEffect, useState } from 'react'

export default function TestSessionPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('TestSession: All cookies:', document.cookie)

    // Check for session cookie
    const hasSessionCookie = document.cookie.includes('session=')
    console.log('TestSession: Has session cookie:', hasSessionCookie)

    if (hasSessionCookie) {
      const cookies = document.cookie.split(';')
      const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('session='))

      if (sessionCookie) {
        try {
          const sessionValue = decodeURIComponent(sessionCookie.split('=')[1])
          const sessionData = JSON.parse(sessionValue)
          setSessionInfo(sessionData)
          console.log('TestSession: Session data:', sessionData)
        } catch (error) {
          console.error('TestSession: Error parsing session:', error)
        }
      }
    }

    setLoading(false)
  }, [])

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Session Test Page</h1>

      <div className="mb-4">
        <h2 className="text-lg font-semibold">All Cookies:</h2>
        <pre className="bg-gray-100 p-2 rounded text-sm">
          {document.cookie || 'No cookies found'}
        </pre>
      </div>

      {sessionInfo ? (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-green-600">Session Found:</h2>
          <pre className="bg-green-50 p-2 rounded text-sm">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-red-600">No Session Found</h2>
        </div>
      )}

      <div className="text-sm text-gray-600">
        <p>Check the browser console for detailed logs</p>
        <p>Go to <a href="/admin" className="text-blue-600 hover:underline">/admin</a> to test RouteGuard</p>
      </div>
    </div>
  )
}
