import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }
    
    const sessionData = JSON.parse(sessionCookie.value)
    
    if (!sessionData || !sessionData.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    
    return NextResponse.json(sessionData)
  } catch (error) {
    console.error('Error checking session:', error)
    return NextResponse.json({ error: 'Session error' }, { status: 500 })
  }
}
