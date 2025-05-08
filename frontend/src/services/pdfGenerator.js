import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from 'qrcode';

export const generarFacturaPDF = async ({
  razonSocial,
  cuitEmisor,
  domicilio,
  nombreCliente,
  docTipo,
  docNro,
  fecha,
  productos,
  total,
  cae,
  caeVto,
  nroFacturaCompleto,
  ptoVta,
  iva,
  subtotal
}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Configuración inicial
  doc.setFont("helvetica", "normal");
  
  // 1. ENCABEZADO
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("FACTURA C", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  
  // Línea divisoria
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(15, 25, 195, 25);

  // 2. DATOS DEL EMISOR
  doc.setFontSize(12);
  doc.text(razonSocial, 15, 35);
  doc.setFontSize(10);
  doc.text(`CUIT: ${formatCUIT(cuitEmisor)}`, 15, 40);
  doc.text(`Domicilio: ${domicilio}`, 15, 45);
  
  // 3. DATOS DE LA FACTURA
  doc.setFont(undefined, "bold");
  doc.text("Comprobante:", 130, 35);
  doc.setFont(undefined, "normal");
  
  // Extraer número de factura del formato "0003-00001234"
  const [ptoVtaFormatted, nroFactura] = nroFacturaCompleto 
    ? nroFacturaCompleto.split('-') 
    : [ptoVta.toString().padStart(4, '0'), '00000000'];
  
  doc.text(`Punto de Venta: ${ptoVtaFormatted}`, 130, 40);
  doc.text(`Nº: ${nroFactura}`, 130, 45);
  doc.text(`Fecha de emisión: ${formatFecha(fecha)}`, 130, 50);

  // 4. DATOS DEL CLIENTE
  doc.setFont(undefined, "bold");
  doc.text("Datos del Cliente:", 15, 60);
  doc.setFont(undefined, "normal");
  doc.text(`Nombre: ${nombreCliente}`, 15, 65);
  doc.text(`Documento (${docTipo}): ${docNro}`, 15, 70);

  // 5. DETALLE DE PRODUCTOS
  doc.setFont(undefined, "bold");
  doc.text("Detalle de Productos:", 15, 80);
  doc.setFont(undefined, "normal");

  // Configurar tabla de productos
  const columns = [
    { header: "Código", dataKey: "codigo" },
    { header: "Descripción", dataKey: "descripcion" },
    { header: "Cantidad", dataKey: "cantidad" },
    { header: "P. Unitario", dataKey: "precioUnitario" },
    { header: "Subtotal", dataKey: "subtotal" },
  ];

  const rows = productos.map((prod) => ({
    codigo: prod.id,
    descripcion: prod.titulo || prod.descripcion,
    cantidad: prod.cantidad,
    precioUnitario: `$${(prod.precioVenta || prod.precio).toFixed(2)}`,
    subtotal: `$${(prod.cantidad * (prod.precioVenta || prod.precio)).toFixed(2)}`,
  }));

  autoTable(doc, {
    startY: 85,
    head: [columns.map(col => col.header)],
    body: rows.map(row => columns.map(col => row[col.dataKey])),
    margin: { left: 15, right: 15 },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Código
      1: { cellWidth: 75 }, // Descripción
      2: { cellWidth: 20, halign: 'right' }, // Cantidad
      3: { cellWidth: 30, halign: 'right' }, // Precio Unitario
      4: { cellWidth: 30, halign: 'right' }, // Subtotal
    },
  });

  // 6. TOTALES
  const finalY = doc.lastAutoTable.finalY + 10;
  
  doc.setFont(undefined, "bold");
  doc.text("RESUMEN DE VALORES", 15, finalY);
  doc.setFont(undefined, "normal");
  
  doc.text(`Subtotal:`, 150, finalY);
  doc.text(`$${subtotal.toFixed(2)}`, 180, finalY, { align: "right" });
  
  doc.text(`IVA 21%:`, 150, finalY + 5);
  doc.text(`$${iva.toFixed(2)}`, 180, finalY + 5, { align: "right" });
  
  doc.setFont(undefined, "bold");
  doc.text(`TOTAL:`, 150, finalY + 10);
  doc.text(`$${total.toFixed(2)}`, 180, finalY + 10, { align: "right" });
  doc.setFont(undefined, "normal");

  // 7. DATOS AFIP
  doc.setFontSize(9);
  doc.text(`CAE: ${cae}`, 15, finalY + 20);
  doc.text(`Vencimiento CAE: ${formatFecha(caeVto)}`, 15, finalY + 25);

  // 8. QR AFIP
  if (cae) {
    try {
      const qrData = {
        ver: 1,
        fecha: formatFechaForQR(fecha),
        cuit: cuitEmisor.replace(/\D/g, ''),
        ptoVta: parseInt(ptoVtaFormatted),
        tipoCmp: 11, // Factura C
        nroCmp: parseInt(nroFactura),
        importe: total,
        moneda: "PES",
        ctz: 1.0,
        tipoDocRec: docTipo === "CUIT" ? 80 : 96,
        nroDocRec: parseInt(docNro.replace(/\D/g, '') || 0),
        tipoCodAut: "E",
        codAut: cae,
      };

      const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify(qrData))}`;
      const qrImageData = await QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      doc.addImage(qrImageData, 'PNG', 140, finalY + 15, 40, 40);
      doc.text("Código QR AFIP", 140, finalY + 60, { align: "center" });
    } catch (error) {
      console.error("Error al generar QR:", error);
      doc.text("(Código QR no disponible)", 140, finalY + 30);
    }
  }

  // 9. PIE DE PÁGINA
  doc.setFontSize(8);
  doc.text("Original: Cliente", 50, 285, { align: "center" });
  doc.text("Duplicado: Archivo", 150, 285, { align: "center" });

  // Guardar el PDF
  doc.save(`Factura_C_${ptoVtaFormatted}_${nroFactura}.pdf`);
};

// Función para formatear CUIT (20-26703609-9)
function formatCUIT(cuit) {
  if (!cuit) return '';
  const cleaned = cuit.replace(/\D/g, '');
  return `${cleaned.substr(0, 2)}-${cleaned.substr(2, 8)}-${cleaned.substr(10)}`;
}

// Función para formatear fecha (de "20250508" a "08/05/2025")
function formatFecha(fechaStr) {
  if (!fechaStr) return '';
  if (fechaStr.includes('/')) return fechaStr; // Ya está formateada
  
  const year = fechaStr.substr(0, 4);
  const month = fechaStr.substr(4, 2);
  const day = fechaStr.substr(6, 2);
  return `${day}/${month}/${year}`;
}

// Función para formatear fecha para QR (de "08/05/2025" a "2025-05-08")
function formatFechaForQR(fechaStr) {
  if (!fechaStr) return '';
  if (fechaStr.includes('-')) return fechaStr; // Ya está formateada
  
  const [day, month, year] = fechaStr.includes('/') 
    ? fechaStr.split('/') 
    : [fechaStr.substr(6, 2), fechaStr.substr(4, 2), fechaStr.substr(0, 4)];
  
  return `${year}-${month}-${day}`;
}