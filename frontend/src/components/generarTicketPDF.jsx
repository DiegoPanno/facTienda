import { jsPDF } from "jspdf";

export function generarTicketPDF(datos) {
  const doc = new jsPDF({
    unit: "mm",
    format: [58, 300], // 58 mm de ancho, altura estimada
  });

  let y = 10;
  const espacio = 5;

  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.text("TIENDA LIBRE DE GLUTEN", 5, y);
  y += espacio;
  doc.text(`Factura C N° ${datos.nroFacturaCompleto}`, 5, y);
  y += espacio;
  doc.text(`Fecha: ${datos.fecha}`, 5, y);
  y += espacio;
  doc.text("CUIT: 20267036099", 5, y);
  y += espacio;
  doc.text("IVA: Monotributo", 5, y);
  y += espacio * 2;

  doc.text(`Cliente: ${datos.cliente.nombre}`, 5, y);
  y += espacio;
  doc.text(
    `${datos.cliente.tipoDoc === 96 ? "DNI" : "CUIT"}: ${datos.cliente.nroDoc}`,
    5,
    y
  );
  y += espacio * 2;

  datos.productos.forEach((prod) => {
    const nombre = prod.descripcion || prod.titulo;
    const cantidad = prod.cantidad;
    const precio = prod.precioUnitario || prod.precioVenta;
    const total = (precio * cantidad).toFixed(2);

    doc.text(nombre, 5, y);
    y += espacio;
    doc.text(`${cantidad} x $${precio.toFixed(2)} = $${total}`, 5, y);
    y += espacio;
  });

  y += espacio;
  doc.text(`Subtotal: $${datos.importeNeto.toFixed(2)}`, 5, y);
  y += espacio;
  doc.text(`Total: $${datos.importeTotal.toFixed(2)}`, 5, y);
  y += espacio;
  doc.text(`CAE: ${datos.CAE}`, 5, y);
  y += espacio;
  doc.text(`Vto CAE: ${datos.CAEVto}`, 5, y);
  y += espacio * 2;
  doc.text("Gracias por su compra", 5, y);

  doc.save(`ticket_${datos.nroFacturaCompleto}.pdf`);
}
