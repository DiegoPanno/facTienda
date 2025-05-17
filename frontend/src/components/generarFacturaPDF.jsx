import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export async function generarFacturaPDF(datos) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const empresa = {
      nombre: "TIENDA LIBRE DE GLUTEN",
      nombreFantasia: "Tienda Libre de Gluten",
      cuit: "20267036099",
      domicilio: "9 DE JULIO 2957, MAR DEL PLATA",
      actividad: "Venta de productos libres de gluten",
      telefono: "2236364740",
      ptoVta: 3
    };

    const cliente = datos.cliente;
    const [ptoVtaRaw, nroFactRaw] = (datos.nroFacturaCompleto || `${empresa.ptoVta}-1`).split("-");
    const ptoVtaFormatted = String(ptoVtaRaw).padStart(4, '0');
    const nroFactura = String(nroFactRaw).padStart(8, '0');

    // Generar QR
    const datosQR = {
      ver: 1,
      fecha: datos.fecha.split('/').reverse().join('-'),
      cuit: empresa.cuit,
      ptoVta: parseInt(ptoVtaFormatted),
      tipoCmp: 11,
      nroCmp: parseInt(nroFactura),
      importe: datos.importeTotal,
      moneda: 'PES',
      ctz: 1.00,
      tipoDocRec: cliente.tipoDoc === 96 ? 99 : 80,
      nroDocRec: cliente.nroDoc,
      tipoCodAut: 'E',
      codAut: datos.CAE
    };

    const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(datosQR)).toString('base64')}`;
    const qrBase64 = await QRCode.toDataURL(qrUrl);

    // Encabezado
    page.drawText(empresa.nombreFantasia, {
      x: 50, y: 780, size: 16, font: fontBold, color: rgb(0, 0.2, 0.4)
    });
    page.drawText(`CUIT: ${empresa.cuit}`, { x: 50, y: 755, size: 10, font });
    page.drawText(empresa.domicilio, { x: 50, y: 740, size: 10, font });
    page.drawText(`Teléfono: ${empresa.telefono}`, { x: 50, y: 725, size: 10, font });

    page.drawText(`FACTURA C N° ${ptoVtaFormatted}-${nroFactura}`, {
    x: 50, y: 700, size: 14, font: fontBold, color: rgb(0, 0, 0)
    });

    page.drawText(`Cliente: ${cliente.nombre}`, { x: 50, y: 670, size: 12, font: fontBold });
    page.drawText(`${cliente.tipoDoc === 96 ? 'DNI' : 'CUIT'}: ${cliente.nroDoc}`, { x: 50, y: 650, size: 12, font });
    page.drawText(`Fecha: ${datos.fecha.split('').slice(0, 4).join('')}-${datos.fecha.split('').slice(4, 6).join('')}-${datos.fecha.split('').slice(6, 8).join('')}`, { x: 400, y: 670, size: 12, font });

    const startY = 620;
    const columnPositions = [50, 300, 400, 500];
    page.drawText('Descripción', { x: columnPositions[0], y: startY, size: 10, font: fontBold });
    page.drawText('Cantidad', { x: columnPositions[1], y: startY, size: 10, font: fontBold });
    page.drawText('P. Unitario', { x: columnPositions[2], y: startY, size: 10, font: fontBold });
    page.drawText('Subtotal', { x: columnPositions[3], y: startY, size: 10, font: fontBold });

    page.drawLine({
      start: { x: 50, y: startY - 5 },
      end: { x: 545, y: startY - 5 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });

    let currentY = startY - 20;
    datos.productos.forEach(producto => {
      page.drawText(producto.descripcion || producto.titulo, { x: columnPositions[0], y: currentY, size: 10, font });
      page.drawText(producto.cantidad.toString(), { x: columnPositions[1], y: currentY, size: 10, font });
      page.drawText(`$${producto.precioUnitario || producto.precioVenta.toFixed(2)}`, { x: columnPositions[2], y: currentY, size: 10, font });
      page.drawText(`$${(producto.cantidad * (producto.precioUnitario || producto.precioVenta)).toFixed(2)}`, { x: columnPositions[3], y: currentY, size: 10, font });
      currentY -= 15;
    });

    currentY -= 20;
    page.drawText(`Subtotal: $${datos.importeNeto.toFixed(2)}`, { x: 400, y: currentY, size: 12, font });
    currentY -= 15;
    page.drawText(`IVA 21%: $${(datos.importeTotal - datos.importeNeto).toFixed(2)}`, { x: 400, y: currentY, size: 12, font });
    currentY -= 15;
    page.drawText(`Total: $${datos.importeTotal.toFixed(2)}`, { x: 400, y: currentY, size: 14, font: fontBold });

    currentY -= 40;
    page.drawText(`CAE: ${datos.CAE}`, { x: 50, y: currentY, size: 12, font: fontBold });
    page.drawText(`Vencimiento CAE: ${datos.CAEVto}`, { x: 50, y: currentY - 15, size: 12, font });

    try {
      const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64.split(',')[1], 'base64'));
      page.drawImage(qrImage, { x: 400, y: currentY - 20, width: 100, height: 100 });
    } catch (e) {
      page.drawText('(QR no disponible)', { x: 400, y: currentY, size: 8, color: rgb(1, 0, 0) });
    }

    page.drawText('Gracias por su compra', { x: 50, y: 50, size: 10, font });
    page.drawText('Tienda Libre de Gluten', { x: 400, y: 50, size: 10, font: fontBold });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Error al generar PDF:', error);
    throw error;
  }
}
