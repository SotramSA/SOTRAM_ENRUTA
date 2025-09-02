import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import ExcelJS from 'exceljs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fechaInicio, fechaFin } = body;

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'Se requieren fechaInicio y fechaFin' },
        { status: 400 }
      );
    }

    // Validar fechas
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    if (inicio > fin) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      );
    }

    // Obtener todos los automóviles activos
    const automoviles = await prisma.automovil.findMany({
      where: {
        activo: true
      },
      orderBy: {
        movil: 'asc'
      }
    });

    if (automoviles.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron automóviles activos' },
        { status: 404 }
      );
    }

    // Obtener todas las planillas en el rango de fechas
    const planillas = await prisma.planilla.findMany({
      where: {
        fecha: {
          gte: inicio,
          lte: fin
        },
        automovil: {
          activo: true
        }
      },
      include: {
        automovil: {
          select: {
            id: true,
            movil: true,
            placa: true
          }
        },
        usuario: {
          select: {
            nombre: true
          }
        }
      }
    });

    // Crear un mapa de planillas por automovilId y fecha
    const planillasMap = new Map<string, any>();
    planillas.forEach(planilla => {
      const fecha = planilla.fecha.toISOString().slice(0, 10);
      const key = `${planilla.automovilId}-${fecha}`;
      planillasMap.set(key, planilla);
    });

    // Generar array de fechas entre inicio y fin
    const fechas: string[] = [];
    const fechaActual = new Date(inicio);
    
    while (fechaActual <= fin) {
      fechas.push(fechaActual.toISOString().slice(0, 10));
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // Crear workbook con ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte Planillas', {
      properties: { tabColor: { argb: '2F5597' } }
    });

    // Configurar encabezados
    const headers = ['Móvil', 'Placa', ...fechas];
    const headerRow = worksheet.addRow(headers);

    // Estilo para encabezados
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2F5597' }
      };
      cell.font = {
        color: { argb: 'FFFFFF' },
        bold: true,
        size: 12,
        name: 'Calibri'
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } }
      };
    });

    // Agregar datos por automóvil
    automoviles.forEach((automovil, autoIndex) => {
      const rowData = [automovil.movil, automovil.placa];
      
      fechas.forEach(fecha => {
        const key = `${automovil.id}-${fecha}`;
        const planilla = planillasMap.get(key);
        
        if (planilla) {
          const usuario = planilla.usuario?.nombre || 'Usuario desconocido';
          rowData.push(`Sí (${usuario})`);
        } else {
          rowData.push('No');
        }
      });
      
      const dataRow = worksheet.addRow(rowData);
      
      // Aplicar estilos a cada celda
      dataRow.eachCell((cell, colNumber) => {
        // Estilo base para todas las celdas
        cell.border = {
          top: { style: 'thin', color: { argb: 'D0D0D0' } },
          left: { style: 'thin', color: { argb: 'D0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'D0D0D0' } },
          right: { style: 'thin', color: { argb: 'D0D0D0' } }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
        cell.font = {
          name: 'Calibri',
          size: 11
        };

        // Estilos específicos por columna
        if (colNumber === 1 || colNumber === 2) {
          // Columnas Móvil y Placa
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F2F2F2' }
          };
          cell.font = {
            ...cell.font,
            color: { argb: '333333' }
          };
        } else {
          // Columnas de fechas
          const valor = cell.value?.toString() || '';
          if (valor.startsWith('Sí')) {
            // Verde para planillas existentes
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'C6EFCE' }
            };
            cell.font = {
              ...cell.font,
              color: { argb: '006100' },
              bold: true
            };
          } else if (valor === 'No') {
            // Rojo para planillas faltantes
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFC7CE' }
            };
            cell.font = {
              ...cell.font,
              color: { argb: '9C0006' },
              bold: true
            };
          }
        }
      });
    });

    // Ajustar ancho de columnas automáticamente
    worksheet.columns.forEach((column, index) => {
      let maxLength = 0;
      
      // Verificar encabezado
      const headerLength = headers[index]?.toString().length || 0;
      maxLength = Math.max(maxLength, headerLength);
      
      // Verificar todas las celdas de datos
      if (column && typeof column.eachCell === 'function') {
        column.eachCell({ includeEmpty: false }, (cell) => {
          const cellLength = cell.value?.toString().length || 0;
          maxLength = Math.max(maxLength, cellLength);
        });
      }
      
      // Establecer ancho con límites mínimo y máximo
      const width = Math.min(Math.max(maxLength + 3, 10), 30);
      column.width = width;
    });

    // Configurar propiedades de impresión
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      }
    };

    // Congelar primera fila y primeras dos columnas
    worksheet.views = [
      {
        state: 'frozen',
        xSplit: 2,
        ySplit: 1,
        topLeftCell: 'C2'
      }
    ];

    // Agregar filtros automáticos en los encabezados
    if (automoviles.length > 0) {
      const lastColumn = String.fromCharCode(65 + headers.length - 1);
      const filterRange = `A1:${lastColumn}1`;
      worksheet.autoFilter = filterRange;
    }

    // Convertir a buffer
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // Crear nombre del archivo
    const fechaInicioStr = fechaInicio.replace(/-/g, '');
    const fechaFinStr = fechaFin.replace(/-/g, '');
    const nombreArchivo = `Reporte_Planillas_${fechaInicioStr}_${fechaFinStr}.xlsx`;

    // Retornar el archivo
    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      },
    });

  } catch (error) {
    console.error('Error al generar reporte Excel:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
