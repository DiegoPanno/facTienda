// src/utils/generarRemitoPDF.js
import generarRemitoPDF from "../utils/generarRemitoPDF";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const generarRemitoPDF = (remito) => {
  const {
    nroRemito,
    productos,
    cliente = null,
    fecha = new Date(),
    observaciones = "",
  } = remito;

  const doc = new jsPDF();

  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleDateString("es-AR");

  // Encabezado tienda
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("TIENDA LIBRE DE GLUTEN", 105, 10, { align: "center" });

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text("9 de Julio 2957 - Mar del Plata", 105, 15, { align: "center" });
  doc.text("Tel: 223 636-4740", 105, 20, { align: "center" });
  doc.text("CUIT: 20-26703609-9", 105, 25, { align: "center" });

  // Título del remito y fecha
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(`Remito Nº ${nroRemito.toString().padStart(3, "0")}`, 14, 35);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Fecha: ${formatearFecha(fecha)}`, 160, 35);

  // Cliente (si hay)
  if (cliente) {
    doc.text(
      `Cliente: ${cliente.nombre} ${
        cliente.cuit ? "- CUIT: " + cliente.cuit : ""
      }`,
      14,
      45
    );
  }

  // Tabla de productos
  const productosFormateados = productos.map((p) => [
    p.cantidad,
    p.descripcion || p.titulo || "Producto",
    `$${p.precio.toFixed(2)}`,
    `$${(p.precio * p.cantidad).toFixed(2)}`,
  ]);

  autoTable(doc, {
    head: [["Cant.", "Descripción", "Precio unit.", "Subtotal"]],
    body: productosFormateados,
    startY: cliente ? 50 : 45,
  });

  // Observaciones y firma
  const afterTableY = doc.lastAutoTable.finalY + 10;
  if (observaciones) {
    doc.text("Observaciones:", 14, afterTableY);
    doc.text(observaciones, 14, afterTableY + 5);
  }

  doc.line(14, afterTableY + 25, 80, afterTableY + 25); // línea para firma
  doc.text("Firma", 14, afterTableY + 30);

  // Guardar PDF
  doc.save(`Remito_${nroRemito.toString().padStart(3, "0")}.pdf`);
};

export default generarRemitoPDF;