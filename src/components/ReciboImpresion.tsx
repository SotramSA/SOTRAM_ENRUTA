'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface ReciboData {
  id: number;
  fechaSalida: string;
  horaSalida: string;
  movil: string;
  placa: string;
  ruta: string;
  conductor: string;
  despachadoPor: string;
  registro: string;
  qrData: string;
}

interface ReciboImpresionProps {
  data: ReciboData;
  onPrint?: () => void;
}

export default function ReciboImpresion({ data, onPrint }: ReciboImpresionProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Generar QR code
    if (qrRef.current && data.qrData) {
      QRCode.toCanvas(qrRef.current, data.qrData, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }
  }, [data.qrData]);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Recibo de Turno</title>
              <style>
                @media print {
                  @page {
                    size: 80mm auto;
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 10px;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.2;
                  }
                }
                body {
                  margin: 0;
                  padding: 10px;
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  line-height: 1.2;
                  width: 80mm;
                  max-width: 80mm;
                }
                .header {
                  text-align: center;
                  margin-bottom: 10px;
                }
                .logo {
                  width: 60px;
                  height: 60px;
                  margin: 0 auto 5px;
                  display: block;
                }
                .company-name {
                  font-size: 14px;
                  font-weight: bold;
                  margin-bottom: 5px;
                }
                .title {
                  font-size: 16px;
                  font-weight: bold;
                  text-align: center;
                  margin: 10px 0;
                  border-bottom: 1px solid #000;
                  padding-bottom: 5px;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 3px 0;
                }
                .label {
                  font-weight: bold;
                }
                .value {
                  text-align: right;
                }
                .qr-section {
                  text-align: center;
                  margin: 10px 0;
                }
                .qr-code {
                  border: 1px solid #000;
                  padding: 5px;
                  display: inline-block;
                }
                .footer {
                  text-align: center;
                  margin-top: 10px;
                  font-size: 10px;
                  border-top: 1px solid #000;
                  padding-top: 5px;
                }
                .divider {
                  border-top: 1px dashed #000;
                  margin: 5px 0;
                }
              </style>
            </head>
            <body>
                               <div class="header">
                   <img src="/logo png.png" alt="Logo" class="logo" />
                   <div class="company-name">SOTRAM S.A</div>
                 </div>
              
              <div class="title">PLANILLA DE VIAJE No. ${data.id}</div>
              
              <div class="info-row">
                <span class="label">Fecha de salida:</span>
                <span class="value">${data.fechaSalida}</span>
              </div>
              
              <div class="info-row">
                <span class="label">Hora de salida:</span>
                <span class="value">${data.horaSalida}</span>
              </div>
              
              <div class="divider"></div>
              
              <div class="info-row">
                <span class="label">Móvil:</span>
                <span class="value">${data.movil}</span>
              </div>
              
              <div class="info-row">
                <span class="label">Placa:</span>
                <span class="value">${data.placa}</span>
              </div>
              
              <div class="info-row">
                <span class="label">Ruta:</span>
                <span class="value">${data.ruta}</span>
              </div>
              
              <div class="divider"></div>
              
              <div class="info-row">
                <span class="label">Conductor:</span>
                <span class="value">${data.conductor}</span>
              </div>
              
              <div class="info-row">
                <span class="label">Despachado por:</span>
                <span class="value">${data.despachadoPor}</span>
              </div>
              
              <div class="info-row">
                <span class="label">Registro:</span>
                <span class="value">${data.registro}</span>
              </div>
              
              <div class="qr-section">
                <div class="qr-code">
                  <canvas id="qr-code" width="120" height="120"></canvas>
                </div>
              </div>
              
              <div class="footer">
               SOTRAM S.A
              </div>
            </body>
          </html>
        `);
        
        printWindow.document.close();
        
        // Generar QR en la ventana de impresión
        setTimeout(() => {
          const qrCanvas = printWindow.document.getElementById('qr-code') as HTMLCanvasElement;
          if (qrCanvas) {
            QRCode.toCanvas(qrCanvas, data.qrData, {
              width: 120,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            }).then(() => {
              printWindow.print();
              printWindow.close();
              onPrint?.();
            });
          }
        }, 100);
      }
    }
  };

  return (
    <div className="hidden">
             <div ref={printRef} className="print-only">
         <div className="header">
           <img src="/logo png.png" alt="Logo" className="logo" />
           <div className="company-name">SOTRAM S.A</div>
         </div>
        
        <div className="title">PLANILLA DE VIAJE No. {data.id}</div>
        
        <div className="info-row">
          <span className="label">Fecha de salida:</span>
          <span className="value">{data.fechaSalida}</span>
        </div>
        
        <div className="info-row">
          <span className="label">Hora de salida:</span>
          <span className="value">{data.horaSalida}</span>
        </div>
        
        <div className="divider"></div>
        
        <div className="info-row">
          <span className="label">Móvil:</span>
          <span className="value">{data.movil}</span>
        </div>
        
        <div className="info-row">
          <span className="label">Placa:</span>
          <span className="value">{data.placa}</span>
        </div>
        
        <div className="info-row">
          <span className="label">Ruta:</span>
          <span className="value">{data.ruta}</span>
        </div>
        
        <div className="divider"></div>
        
        <div className="info-row">
          <span className="label">Conductor:</span>
          <span className="value">{data.conductor}</span>
        </div>
        
        <div className="info-row">
          <span className="label">Despachado por:</span>
          <span className="value">{data.despachadoPor}</span>
        </div>
        
        <div className="info-row">
          <span className="label">Registro:</span>
          <span className="value">{data.registro}</span>
        </div>
        
        <div className="qr-section">
          <div className="qr-code">
            <canvas ref={qrRef} width="120" height="120"></canvas>
          </div>
        </div>
        
        <div className="footer">
          SOTRAM S.A
        </div>
      </div>
      
      <style jsx>{`
        .print-only {
          width: 80mm;
          max-width: 80mm;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.2;
          padding: 10px;
        }
        .header {
          text-align: center;
          margin-bottom: 10px;
        }
        .logo {
          width: 60px;
          height: 60px;
          margin: 0 auto 5px;
          display: block;
        }
        .company-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .title {
          font-size: 16px;
          font-weight: bold;
          text-align: center;
          margin: 10px 0;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        .label {
          font-weight: bold;
        }
        .value {
          text-align: right;
        }
        .qr-section {
          text-align: center;
          margin: 10px 0;
        }
        .qr-code {
          border: 1px solid #000;
          padding: 5px;
          display: inline-block;
        }
        .footer {
          text-align: center;
          margin-top: 10px;
          font-size: 10px;
          border-top: 1px solid #000;
          padding-top: 5px;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 5px 0;
        }
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
} 