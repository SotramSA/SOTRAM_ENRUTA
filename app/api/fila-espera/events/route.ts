import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/src/lib/session';

// Mantener conexiones activas
const connections = new Set<ReadableStreamDefaultController>();

// Función para enviar eventos a todas las conexiones
function notifyFilaChange(event: string, data: any) {
  const message = `data: ${JSON.stringify({ event, data, timestamp: new Date().toISOString() })}\n\n`;
  
  connections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      // Remover conexiones cerradas
      connections.delete(controller);
    }
  });
}

// GET - Endpoint de Server-Sent Events
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Crear stream para SSE
    const stream = new ReadableStream({
      start(controller) {
        // Agregar conexión al set
        connections.add(controller);
        
        // Enviar evento inicial
        const initialMessage = `data: ${JSON.stringify({
          event: 'connected',
          data: { message: 'Conectado a notificaciones de fila de espera' },
          timestamp: new Date().toISOString()
        })}\n\n`;
        
        controller.enqueue(new TextEncoder().encode(initialMessage));
        
        // Enviar estado actual de la fila
        prisma.filaEspera.findMany({
          where: { estado: 'ESPERANDO' },
          orderBy: { fechaCreacion: 'asc' },
          include: {
            usuarioDespacho: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }).then(fila => {
          const filaMessage = `data: ${JSON.stringify({
            event: 'fila_inicial',
            data: fila,
            timestamp: new Date().toISOString()
          })}\n\n`;
          
          controller.enqueue(new TextEncoder().encode(filaMessage));
        }).catch(error => {
          console.error('Error al obtener fila inicial:', error);
        });
      },
      
      cancel(controller) {
        // Remover conexión cuando se cancela
        connections.delete(controller);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });
  } catch (error) {
    console.error('Error en SSE endpoint:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}