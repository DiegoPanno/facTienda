import { obtenerProductos } from "../services/productService";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";

const cmToPt = (cm) => cm * 28.35;

const GenerarEtiquetasPDF = () => {
  const generarPDF = async () => {
    const productos = await obtenerProductos();
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([cmToPt(21), cmToPt(29.7)]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const etiquetaAncho = cmToPt(7);
    const etiquetaAlto = cmToPt(4);
    const margin = cmToPt(1);
    const spacing = cmToPt(0.3);

    const cols = Math.floor(
      (page.getWidth() - 2 * margin + spacing) / (etiquetaAncho + spacing)
    );
    const rows = Math.floor(
      (page.getHeight() - 2 * margin + spacing) / (etiquetaAlto + spacing)
    );

    let x = margin;
    let y = page.getHeight() - margin - etiquetaAlto;
    let count = 0;

    for (let i = 0; i < productos.length; i++) {
      const prod = productos[i];
      const titulo = (prod.titulo || "").toUpperCase();
      const codigo = prod.codigo || prod.id || prod.sku || "";
      const precio = prod.precioVenta
        ? `$${Math.round(parseFloat(prod.precioVenta))}`
        : `$${Math.round(
            parseFloat(prod.precioBase || 0) *
              (1 + parseFloat(prod.margen || 0) / 100)
          )}`;

      // Dibujo del borde de la etiqueta
      page.drawRectangle({
        x,
        y,
        width: etiquetaAncho,
        height: etiquetaAlto,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
      });

      // Título del producto (máximo 2 líneas)
      const palabras = titulo.split(" ");
      const linea1 = palabras.slice(0, 4).join(" ");
      const linea2 = palabras.slice(4).join(" ");

      page.drawText(linea1, {
        x: x + cmToPt(0.3),
        y: y + etiquetaAlto - cmToPt(1),
        size: 10,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      if (linea2) {
        page.drawText(linea2, {
          x: x + cmToPt(0.3),
          y: y + etiquetaAlto - cmToPt(1.6),
          size: 8,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      }

      // Precio centrado y grande
      page.drawText(precio, {
        x: x + etiquetaAncho / 2 - precio.length * 4.5,
        y: y + cmToPt(1.2),
        size: 25,
        font: fontBold,
        color: rgb(0, 0.5, 0),
      });

      // Código abajo
      if (codigo) {
        page.drawText(`COD: ${codigo}`, {
          x: x + cmToPt(0.3),
          y: y + cmToPt(0.3),
          size: 6,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      // Posicionamiento
      x += etiquetaAncho + spacing;
      count++;
      if (count % cols === 0) {
        x = margin;
        y -= etiquetaAlto + spacing;
        if (y < margin) {
          const newPage = pdfDoc.addPage([cmToPt(21), cmToPt(29.7)]);
          page = newPage;
          x = margin;
          y = page.getHeight() - margin - etiquetaAlto;
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    saveAs(blob, "etiquetas_gondola.pdf");
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <button
        onClick={generarPDF}
        style={{
          padding: "10px 20px",
          backgroundColor: "#1976d2",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        🧾 Generar PDF Etiquetas 7x4 cm
      </button>
    </div>
  );
};

export default GenerarEtiquetasPDF;
